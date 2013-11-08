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
  ApexCoverageViewer.showCurrentPageCoverage = function showCurrentPageCoverage() {
    var currentPageId = location.pathname.replace(/^\//, '');
    var mergeCoveredLines = this.mergeCoveredLines,
        getNodesByXpath = this.getNodesByXpath;
    this.getCoverageByClassId(currentPageId, function (qr) {
      function pickCoverageField(rec) {
        return rec.Coverage;
      }
      var coverages = qr.records.map(pickCoverageField);
      var coverage = mergeCoveredLines(coverages);
      
      var xpath = '//td[@id="ApexClassViewPage:theTemplate:theForm:thePageBlock:j_id70:j_id71:j_id74:0:j_id75"]/text()';
      var xpathResult = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE , null);
      var lineHeaders = getNodesByXpath(xpath);
      var headerHash = lineHeaders.reduce(function (hash, node) {
        hash[node.nodeValue] = node;
        return hash;
      }, {});
      function boxize(node) {
        var box = document.createElement('span'),
            parent = node.parentNode;
        box.textContent = node.nodeValue;
        box.style.width = '100%';
        box.style.display = 'inline-block';
        parent.insertBefore(box, node);
        parent.removeChild(node);
        return box;
      }
      coverage.coveredLines.forEach(function (line) {
        var box = boxize(headerHash[line]);
        box.style.backgroundColor = '#CCFFFF';
      });
      coverage.uncoveredLines.forEach(function (line) {
        var box = boxize(headerHash[line]);
        box.style.backgroundColor = '#FFCCCC';
      });
    });
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