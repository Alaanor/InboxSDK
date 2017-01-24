InboxSDK.load(2, "attachment-card-exmaple").then(function(sdk){
	'use strict';

	window._sdk = sdk;

	sdk.Conversations.registerFileAttachmentCardViewHandler(card => {
		card.addButton({
			iconUrl: chrome.runtime.getURL('zipicon.png'),
			tooltip: 'Foo1',
			onClick(event) {
				console.log('click', event);
				event.getDownloadURL().then(url => {
					console.log('download url', url);
				});
			}
		});
	});

	sdk.Conversations.registerMessageViewHandler(function(messageView){
		console.log('got messageView', messageView.getMessageID());

		messageView.addAttachmentCardView({

			title: 'Test image long title testing test foobar123456',
			description: 'Test description',
			previewUrl: 'https://www.google.com',
			previewThumbnailUrl: chrome.runtime.getURL('partycat.jpg'),
			failoverPreviewIconUrl: chrome.runtime.getURL('partycat.jpg'),
			fileIconImageUrl: chrome.runtime.getURL('zipicon.png'),
			mimeType: 'image/jpg',
			previewOnClick() {
				alert('preview button clicked');
			},
			buttons: [
				{
					downloadUrl: 'https://www.streak.com',
					openInNewTab: true
				},
				{
					iconUrl: chrome.runtime.getURL('zipicon.png'),
					tooltip: 'Foo bar1',
					onClick() {
						alert('Foo bar button clicked');
					}
				},
				{
					iconUrl: chrome.runtime.getURL('zipicon.png'),
					tooltip: 'Foo bar2',
					onClick() {
						alert('Foo bar button clicked');
					}
				},
				{
					iconUrl: chrome.runtime.getURL('zipicon.png'),
					tooltip: 'Foo bar3',
					onClick() {
						alert('Foo bar button clicked');
					}
				}
			]

		});


		var attachmentCard = messageView.addAttachmentCardView({

			title: 'Test file',
			description: 'Test description 2',
			previewUrl: 'https://www.google.com',
			previewThumbnailUrl: chrome.runtime.getURL('partycat.jpg'),
			fileIconImageUrl: chrome.runtime.getURL('zipicon.png'),
			buttons: [
				{
					downloadUrl: 'https://www.streak.com'
				}
			]
		});


		messageView.addAttachmentCardViewNoPreview({

			title: 'Test Icon file',
			description: 'Test description icon',
			previewUrl: 'https://www.google.com',
			iconThumbnailUrl: chrome.runtime.getURL('zipicon.png'),
			fileIconImageUrl: chrome.runtime.getURL('zipicon.png'),
			buttons: [
				{
					downloadUrl: 'https://www.streak.com'
				}
			]
		});

		messageView.getFileAttachmentCardViews().forEach(function(card, i) {
			console.log(i, 'attachment card', card);
			console.log(i, 'type', card.getAttachmentType());
			console.log(i, 'title', card.getTitle());
			card.addButton({
				iconUrl: chrome.runtime.getURL('zipicon.png'),
				tooltip: 'Foo2',
				onClick(event) {
					console.log('click2', event);
					card.getDownloadURL().then(url => {
						console.log('old, url', url);
					});
					event.getDownloadURL().then(url => {
						console.log('new, url', url);
					});
				}
			});
		});

		messageView.addAttachmentsToolbarButton({
			tooltip: 'Tooltip here',
			iconUrl: 'https://www.streak.com/build/images/circle_exclamation_mark.png',
			onClick(event) {
				const attachmentCardViews = event.attachmentCardViews;
				console.log('attachment cards', attachmentCardViews);
				for (let card of attachmentCardViews) {
					console.log('card type', card.getAttachmentType());
					console.log('card title', card.getTitle());
					card.getDownloadURL().then(url => {
						console.log('card url', url);
					}, err => console.error(err));
				}
			}
		});

		messageView.addAttachmentIcon({
			iconClass: 'eye_icon',
			tooltip: '1thing'
		});
		messageView.addAttachmentIcon(Kefir.repeat(function() {
			return Kefir.sequentially(2000, [
				{
					iconClass: 'eye_icon',
					tooltip: '2thing',
					onClick: alert.bind(window, 'foo')
				},
				{
					iconUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/gplus.png',
					tooltip: '2blah blah'
				}
			]);
		}));
	});

});
