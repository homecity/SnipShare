// snipit.sh embed script
// Usage: <script src="https://snipit.sh/embed.js" data-snippet="SNIPPET_ID" data-theme="dark" data-height="400"></script>
(function() {
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];

  var snippetId = currentScript.getAttribute('data-snippet');
  if (!snippetId) return;

  var theme = currentScript.getAttribute('data-theme') || 'dark';
  var height = currentScript.getAttribute('data-height') || '400';
  var origin = currentScript.src.replace(/\/embed\.js.*$/, '');

  var iframe = document.createElement('iframe');
  iframe.src = origin + '/embed/' + snippetId + '?theme=' + theme;
  iframe.width = '100%';
  iframe.height = height + 'px';
  iframe.frameBorder = '0';
  iframe.style.borderRadius = '8px';
  iframe.style.border = '1px solid ' + (theme === 'dark' ? '#334155' : '#e2e8f0');
  iframe.style.display = 'block';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');

  currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);
})();
