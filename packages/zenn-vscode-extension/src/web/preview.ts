const init = async () => {
    await import('zenn-embed-elements');
};

window.addEventListener('vscode.markdown.updateContent', init);

init();