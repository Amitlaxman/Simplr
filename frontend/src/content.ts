console.log('Simplr content script running');

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "GET_PAGE_TEXT") {
        // Simple extraction: get all visible text
        const text = document.body.innerText;
        sendResponse({ text: text });
    }
    return true;
});

export { };
