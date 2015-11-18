// ==UserScript==
// @name           ApexCoverageViewer
// @description    
// @include        *.salesforce.com/01p*
// ==/UserScript==

(function (global) {
  var ApexCoverageViewer = global.ApexCoverageViewer = {};
  ApexCoverageViewer.token = document.cookie.match(/sid=[^(; )]+/)[0];
  ApexCoverageViewer.getCoverageByClassId = function getCoverageByClassId(classId, callback) {
    var req = new XMLHttpRequest();
    var query = 'SELECT Coverage FROM ApexCodeCoverage WHERE ApexClassOrTriggerId = \'' + classId + '\'';
    var url = '/services/data/v29.0/tooling/query?q=' + encodeURIComponent(query);;
    req.open('GET', url, true);
    req.setRequestHeader('Authorization', 'OAuth ' + this.token);
    req.setRequestHeader('Accept', 'application/json');
    req.setRequestHeader('Content-Type', 'application/json');
    req.onload = function (event) {
      var req = event.target;
      var result = JSON.parse(req.responseText);
      callback(result);
    };
    req.send(null);
  };
  ApexCoverageViewer.mergeCoveredLines = function mergeCoveredLines(coverages) {
    function setLinesAsKey(hash, lines) {
      lines && lines.forEach(function (line) {
        hash[line] = true;
      });
    }
    function toInt(str) {
      return parseInt(str, 10);
    }
    var coveredHash = {},
        uncoveredHash = {};
    coverages.forEach(function (data) {
      setLinesAsKey(coveredHash, data.coveredLines);
      setLinesAsKey(uncoveredHash, data.uncoveredLines);
    });
    var covered = Object.keys(coveredHash);
    covered.forEach(function (line) {
      delete uncoveredHash[line];
    });
    return {
      coveredLines: covered.map(toInt),
      uncoveredLines: Object.keys(uncoveredHash).map(toInt)
    };
  };
  ApexCoverageViewer.getNodesByXpath = function getNodesByXpath(xpath) {
    var result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE , null),
        nodes = [],
        i = 0,
        len = result.snapshotLength;
    for (; i < len; i++) {
      nodes.push(result.snapshotItem(i));
    }
    return nodes;
  };
  ApexCoverageViewer.setStyleSheet = function setStyleSheet() {
    var el = document.createElement('style');
    el.type = 'text/css';
    el.id = 'acv-css';
    el.innerHTML = '' +
'.acv-line-header {' +
' display: inline-block;' +
' width: 100%;' +
'}' +
'.acv-covered {' +
' background-color: #CCFFFF;' +
'}' +
'.acv-uncovered {' +
' background-color: #FFCCCC;' +
'}';
    document.head.appendChild(el);
  };
  ApexCoverageViewer.elementizeLineHeaders = function elementizeLineHeaders() {
    function boxize(node) {
      var box = document.createElement('span'),
          parent = node.parentNode;
      box.textContent = node.nodeValue;
      box.classList.add('acv-line-header');
      parent.insertBefore(box, node);
      parent.removeChild(node);
      return box;
    }
    var cache = elementizeLineHeaders.headers;
    if (cache) {
      Object.keys(cache).forEach(function (key) {
        var el = cache[key];
        el.classList.remove('acv-covered');
        el.classList.remove('acv-uncovered');
      });
      return elementizeLineHeaders.headers;
    }
    this.setStyleSheet();
    var xpath = '//td[@id="ApexClassViewPage:theTemplate:theForm:thePageBlock:j_id70:j_id71:j_id74:0:j_id75"]/text()';
    var lineHeaders = this.getNodesByXpath(xpath);
    // use reduce without Prototype.js
    var headerHash = lineHeaders.reduceRight(function (hash, node) {
      hash[node.nodeValue] = boxize(node);
      return hash;
    }, {});
    elementizeLineHeaders.headers = headerHash;
    return headerHash;
  };
  ApexCoverageViewer.showCurrentPageCoverage = function showCurrentPageCoverage() {
    var currentPageId = location.pathname.replace(/^\//, '');
    var mergeCoveredLines = this.mergeCoveredLines,
        elementizeLineHeaders = this.elementizeLineHeaders.bind(this);
    this.getCoverageByClassId(currentPageId, function (qr) {
      function pickCoverageField(rec) {
        return rec.Coverage;
      }
      var coverages = qr.records.map(pickCoverageField);
      var coverage = mergeCoveredLines(coverages);
      var headers = elementizeLineHeaders();
      coverage.coveredLines.forEach(function (line) {
        var header = headers[line];
        header.classList.add('acv-covered');
      });
      coverage.uncoveredLines.forEach(function (line) {
        var header = headers[line];
        header.classList.add('acv-uncovered');
      });
    });
  };
  ApexCoverageViewer.addClickListener = function addClickListener() {
    var coverageNextEl = document.querySelector('span[id$=":codeCoverage"]');
    if (!coverageNextEl) {
      return;
    }
    var coverageTextNode = coverageNextEl.previousSibling;
    var parentEl = coverageTextNode.parentNode;
    var newLink = document.createElement('a');
    newLink.textContent = coverageTextNode.nodeValue;
    newLink.href = '';
    var showCoverage = this.showCurrentPageCoverage.bind(this);
    newLink.addEventListener('click', function (event) {
      event.preventDefault();
      showCoverage();
    });
    parentEl.appendChild(newLink);
    parentEl.removeChild(coverageTextNode);
  };
  ApexCoverageViewer.addClickListener();
}(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window));
