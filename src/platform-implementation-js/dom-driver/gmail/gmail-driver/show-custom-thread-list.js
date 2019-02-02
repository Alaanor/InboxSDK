/* @flow */

import find from 'lodash/find';
import Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import * as GRP from '../gmail-response-processor';
import * as SyncGRP from '../gmail-sync-response-processor';
import type Logger from '../../../lib/logger';
import type GmailDriver from '../gmail-driver';
import isStreakAppId from '../../../lib/isStreakAppId';

type ThreadDescriptor =
  | string
  | {
      gmailThreadId?: ?string,
      rfcMessageId?: ?string
    };

type InitialIDPair =
  | { rfcId: string }
  | { gtid: string }
  | { rfcId: string, gtid: string };
type IDPairWithRFC = { rfcId: string, gtid?: string };
type CompletedIDPair = { rfcId: string, gtid: string };

type HandlerResult = {
  total?: number,
  hasMore?: boolean,
  threads: Array<ThreadDescriptor>
};

type NormalizedHandlerResult<T> = {
  start: number,
  total: number | 'MANY',
  threads: T
};

const threadListHandlersToSearchStrings: Map<Function, string> = new Map();

const MAX_THREADS_PER_PAGE = 50;

/*
Timeline of how a custom thread list works:

* App registers a custom list by calling sdk.Router.handleCustomListRoute(),
  which forwards the call to the driver where the route id and handler are
  saved.

<User eventually navigates to a custom list route>

* setup-route-view-driver-stream.js receives the hashchange event, recognizes
  that it matched a registered custom list route id, and then calls this file's
  showCustomThreadList function instead of creating a RouteView.

* showCustomThreadList registers a bunch of listeners to respond at the right
  times in the coming storm.

* showCustomThreadList hides the text in the search box, so the nonsense search
  isn't visible to the user.

* showCustomThreadList sets it all in motion by navigating the user to a search
  for a random string.

<Gmail thinks the user has navigated to a search, and triggers an AJAX request
for the search>

* We intercept the search request before it goes out, call the handler function
  the app gave us to figure out the RFC message IDs the app wants to show, and
  then rewrite the search request to be a search for those specific messages.

* We let the request through, and then look up all of the gmail thread ids for
  the requested messages.

<The server sends the browser the AJAX response back>

* We intercept the response, and reorder the messages in the response into the
  order that the app wants.

<Gmail gets our rewritten AJAX response, and switches the DOM to the search
 results>

* When the search completes and Gmail switches to the search results,
  setup-route-view-driver-stream.js recognizes the search string in the URL,
  clears the search box, changes the hash in the URL to look like the custom
  list route id, and associates the new RouteView with the custom list.

*/

function copyAndOmitExcessThreads(
  ids: Array<ThreadDescriptor>,
  logger: Logger
): Array<ThreadDescriptor> {
  if (ids.length > MAX_THREADS_PER_PAGE) {
    // upgrade to deprecationWarning later
    logger.error(
      new Error(
        'Received more than the maximum number of threads specified by handler, ' +
          'ignoring additional threads (https://www.inboxsdk.com/docs/#Router).'
      )
    );
  }
  return ids.slice(0, MAX_THREADS_PER_PAGE);
}

function findIdFailure(id: string, err: Error) {
  console.log('Failed to find id for thread', id, err); //eslint-disable-line no-console
  return null;
}

function parseOnActivateResult(
  logger: Logger,
  start: number,
  result: HandlerResult | Array<ThreadDescriptor>
): { total: number | 'MANY', threads: ThreadDescriptor[] } {
  if (Array.isArray(result)) {
    logger.deprecationWarning(
      'Returning an array from a handleCustomListRoute handler',
      'a CustomListDescriptor object'
    );
    const threads = copyAndOmitExcessThreads(result, logger);
    return {
      // default to one page since arrays can't be paginated
      total: threads.length,
      threads
    };
  } else if (typeof result === 'object') {
    const { total, hasMore, threads } = result;

    if (!Array.isArray(threads)) {
      throw new Error(
        'handleCustomListRoute result must contain a "threads" array ' +
          '(https://www.inboxsdk.com/docs/#Router).'
      );
    }

    if (total != null && hasMore != null) {
      throw new Error(
        'handleCustomListRoute result must only contain either ' +
          'a "total" or a "hasMore" property, but not both. ' +
          '(https://www.inboxsdk.com/docs/#Router).'
      );
    }

    if (typeof total === 'number') {
      return {
        total,
        threads: copyAndOmitExcessThreads(threads, logger)
      };
    } else if (typeof hasMore === 'boolean') {
      const threadsWithoutExcess = copyAndOmitExcessThreads(threads, logger);
      return {
        total: hasMore ? 'MANY' : start + threads.length,
        threads: threadsWithoutExcess
      };
    } else {
      throw new Error(
        'handleCustomListRoute result must contain either a "total" number ' +
          'or a "hasMore" boolean (https://www.inboxsdk.com/docs/#Router).'
      );
    }
  } else {
    throw new Error(
      'handleCustomListRoute result must be an array or an object ' +
        '(https://www.inboxsdk.com/docs/#Router).'
    );
  }
}

function threadDescriptorToInitialIDPair(id: ThreadDescriptor): ?InitialIDPair {
  if (typeof id === 'string') {
    if (id[0] == '<') {
      return { rfcId: id };
    } else {
      return { gtid: id };
    }
  } else if (id) {
    const obj = {
      gtid: typeof id.gmailThreadId === 'string' && id.gmailThreadId,
      rfcId: typeof id.rfcMessageId === 'string' && id.rfcMessageId
    };
    if (obj.gtid || obj.rfcId) {
      return (obj: any);
    }
  }
}

// Returns the search string that will trigger the onActivate function.
const setupSearchReplacing = (
  driver: GmailDriver,
  customRouteID: string,
  onActivate: Function
): string => {
  const preexistingQuery = threadListHandlersToSearchStrings.get(onActivate);
  if (preexistingQuery) {
    return preexistingQuery;
  }
  const newQuery = Date.now() + '-' + Math.random();
  driver.getPageCommunicator().setupCustomListResultsQuery(newQuery);
  driver
    .getPageCommunicator()
    .ajaxInterceptStream.filter(
      e => e.type === 'searchForReplacement' && e.query === newQuery
    )
    .flatMap(({ start }: { start: number }) => {
      driver.signalCustomThreadListActivity(customRouteID);
      try {
        return Kefir.fromPromise(
          Promise.resolve(onActivate(start, MAX_THREADS_PER_PAGE)).then(
            (result: HandlerResult) => ({ start, result })
          )
        );
      } catch (e) {
        return Kefir.constantError(e);
      }
    })
    .flatMap(
      ({
        start,
        result
      }: {
        start: number,
        result: HandlerResult | Array<ThreadDescriptor>
      }) => {
        try {
          const { total, threads } = parseOnActivateResult(
            driver.getLogger(),
            start,
            result
          );
          return Kefir.constant({
            start,
            total,
            threads
          });
        } catch (err) {
          return Kefir.constantError(err);
        }
      }
    )
    .flatMapErrors(e => {
      driver.getLogger().error(e);
      return Kefir.constant({ start: 0, total: 0, threads: [] });
    })
    .map(
      ({
        start,
        total,
        threads
      }: NormalizedHandlerResult<Array<ThreadDescriptor>>) => ({
        start,
        total,
        threads: threads.map(threadDescriptorToInitialIDPair).filter(Boolean)
      })
    )
    // Figure out any rfc ids we don't know yet
    .map(
      ({ start, total, threads }: NormalizedHandlerResult<InitialIDPair[]>) =>
        Promise.all(
          threads.map(
            (pair: InitialIDPair): Promise<?IDPairWithRFC> => {
              if (pair.rfcId) {
                return Promise.resolve(((pair: any): IDPairWithRFC));
              } else if (typeof pair.gtid === 'string') {
                const gtid = pair.gtid;
                return driver
                  .getRfcMessageIdForGmailThreadId(gtid)
                  .then(
                    rfcId => ({ gtid, rfcId }),
                    err => findIdFailure(gtid, err)
                  );
              }
              return Promise.resolve(null);
            }
          )
        ).then((pairs: Array<?IDPairWithRFC>) => ({
          start,
          total,
          threads: pairs.filter(Boolean)
        }))
    )
    .flatMap(Kefir.fromPromise)
    .onValue(
      ({ start, total, threads }: NormalizedHandlerResult<IDPairWithRFC[]>) => {
        const messageIDQuery: string =
          threads.length > 0
            ? threads.map(({ rfcId }) => 'rfc822msgid:' + rfcId).join(' OR ')
            : '' + Math.random() + Date.now(); // google doesn't like empty searches

        // Outgoing requests for list queries always need to have a `start` of 0,
        // because we only ever ask for 1 page-worth of threads per query.
        // When the response comes back, we modify it to have a `start` consistent
        // with whatever page was being loaded so Gmail's UI makes sense.
        driver.getPageCommunicator().setCustomListNewQuery({
          newQuery: messageIDQuery,
          newStart: 0,
          query: newQuery,
          start
        });
        Kefir.combine(
          [
            // Figure out any gmail thread ids we don't know yet
            Kefir.fromPromise(
              Promise.all(
                threads.map(pair =>
                  pair.gtid
                    ? pair
                    : driver
                        .getGmailThreadIdForRfcMessageId(pair.rfcId)
                        .then(
                          gtid => ({ gtid, rfcId: pair.rfcId }),
                          err => findIdFailure(pair.rfcId, err)
                        )
                )
              )
            ).map(list => list.filter(Boolean)),

            driver
              .getPageCommunicator()
              .ajaxInterceptStream.filter(
                e =>
                  e.type === 'searchResultsResponse' &&
                  e.query === newQuery &&
                  e.start === start
              )
              .map(x => x.response)
              .take(1)
          ],
          (idPairs: any, response: any) => [idPairs, response]
        ).onValue(([idPairs, response]: [CompletedIDPair[], string]) => {
          // override thread list response so that we show results in the same
          // order that user passed in
          driver.signalCustomThreadListActivity(customRouteID);

          let newResponse;
          try {
            if (driver.isUsingSyncAPI()) {
              const extractedThreads = SyncGRP.extractThreadsFromSearchResponse(
                response
              );

              const doesNeedReorder = idPairs.some(
                ({ gtid }, index) =>
                  extractedThreads[index].oldGmailThreadID !== gtid
              );

              const reorderedThreads: typeof extractedThreads = doesNeedReorder
                ? idPairs
                    .map(({ gtid }) =>
                      find(extractedThreads, t => t.oldGmailThreadID === gtid)
                    )
                    .filter(Boolean)
                    .map((extractedThread, index) => {
                      const newTime = String(Date.now() - index);
                      extractedThread.rawResponse[1][3] = newTime;
                      extractedThread.rawResponse[1][8] = newTime;
                      (extractedThread.rawResponse[1][5] || []).forEach(md => {
                        md[7] = newTime;
                        md[18] = newTime;
                        md[31] = newTime;
                      });
                      return extractedThread;
                    })
                : extractedThreads;

              newResponse = SyncGRP.replaceThreadsInSearchResponse(
                response,
                reorderedThreads,
                { start, total }
              );
            } else {
              const extractedThreads = GRP.extractThreads(response);

              const reorderedThreads: typeof extractedThreads = idPairs
                .map(({ gtid }) =>
                  find(extractedThreads, t => t.gmailThreadId === gtid)
                )
                .filter(Boolean);

              newResponse = GRP.replaceThreadsInResponse(
                response,
                reorderedThreads,
                { start, total }
              );
            }

            driver
              .getPageCommunicator()
              .setCustomListResults(newQuery, newResponse);
          } catch (e) {
            driver.getLogger().error(e, {
              responseReplacementFailure: true,
              //response: isStreakAppId(driver.getAppId()) ? response : null,
              idPairsLength: idPairs.length
            });
            const butterBar = driver.getButterBar();
            if (butterBar) {
              butterBar.showError({
                text: 'Failed to load custom thread list'
              });
            }
            try {
              if (driver.isUsingSyncAPI()) {
                driver.getPageCommunicator().setCustomListResults(
                  newQuery,
                  SyncGRP.replaceThreadsInSearchResponse(response, [], {
                    start,
                    total
                  })
                );
              } else {
                driver
                  .getPageCommunicator()
                  .setCustomListResults(
                    newQuery,
                    GRP.replaceThreadsInResponse(response, [], { start, total })
                  );
              }
            } catch (e2) {
              driver.getLogger().error(e2);
              // The original response will be used.
              driver.getPageCommunicator().setCustomListResults(newQuery, null);
            }
            return;
          }

          setTimeout(() => {
            const errorBar = document.querySelector('.vY .vX.UC');
            if (
              errorBar &&
              errorBar.style.display !== 'none' &&
              /#\d+/.test(errorBar.textContent)
            ) {
              const isStreak = isStreakAppId(driver.getAppId());
              driver
                .getLogger()
                .error(new Error('Gmail error with custom thread list'), {
                  message: errorBar.textContent,
                  idPairsLength: idPairs.length,
                  response: isStreak ? response : null,
                  newResponse: isStreak ? newResponse : null
                });
            }
          }, 1000);
        });
      }
    );

  driver.getCustomListSearchStringsToRouteIds().set(newQuery, customRouteID);
  threadListHandlersToSearchStrings.set(onActivate, newQuery);
  return newQuery;
};

export default function showCustomThreadList(
  driver: GmailDriver,
  customRouteID: string,
  onActivate: Function,
  params: Array<string>
) {
  const uniqueSearch = setupSearchReplacing(driver, customRouteID, onActivate);
  const customHash = document.location.hash;

  const nextMainContentElementChange = GmailElementGetter.getMainContentElementChangedStream()
    .changes()
    .take(1);

  const searchInput = GmailElementGetter.getSearchInput();
  if (!searchInput) throw new Error('could not find search input');
  searchInput.value = '';
  searchInput.style.visibility = 'hidden';
  nextMainContentElementChange.onValue(() => {
    // setup-route-view-driver-stream handles clearing search again
    searchInput.style.visibility = 'visible';
  });

  // Change the hash *without* making a new history entry.
  const searchHash =
    '#search/' + [uniqueSearch, ...params].map(encodeURIComponent).join('/');
  window.history.replaceState(null, null, searchHash);
  // Create a hashchange event so setup-route-view-driver-stream sees this event.
  const hce = new (window: any).HashChangeEvent('hashchange', {
    oldURL: document.location.href.replace(/#.*$/, '') + customHash,
    newURL: document.location.href.replace(/#.*$/, '') + searchHash
  });
  window.dispatchEvent(hce);
}
