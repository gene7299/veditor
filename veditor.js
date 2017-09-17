"use strict";
var editor;

var layouteditor = function (id) {

  var handle = {};
  handle.arg1 = null;
  handle.arg2 = null;
  handle.enable_debug = true;
  handle.canvaswidth = 0;
  handle.canvasheight = 0;
  handle.interact = null;

  var shapes = [];
  var shapeId = 1;
  var mySel = null;
  var multiSel = [];
  var dom_editorwrapper = document.getElementById(id);
  var dom_dragMain = dom_editorwrapper.querySelector('.drag_main');
  var dom_canvasMain = dom_editorwrapper.querySelector('.canvas_main');
  handle.shapes = shapes;

  var s = new CanvasState(dom_canvasMain, dom_dragMain);
  handle.s = s;

  function _debug() {
    this.log = function (x) {
      if (handle.enable_debug) {
        console.log(x);
      }
    };
    return;
  }
  var debug = new _debug();
  //------------------------------------------------------------------------------------------------------------
  // Support from interactjs
  // Does the browser support touch input?
  var supportsTouch = (('ontouchstart' in window) || window.DocumentTouch && document instanceof window.DocumentTouch);
  debug.log("supportsTouch=" + supportsTouch);
  //window.alert('supportsTouch='+supportsTouch)
  // Does the browser support PointerEvents
  // Avoid PointerEvent bugs introduced in Chrome 55
  if (typeof PointerEvent != 'undefined')
    var supportsPointerEvent = PointerEvent && !/Chrome/.test(navigator.userAgent);
  debug.log("supportsPointerEvent=" + supportsPointerEvent);
  // Opera Mobile must be handled differently
  var isOperaMobile = navigator.appName == 'Opera' &&
    supportsTouch &&
    navigator.userAgent.match('Presto');
  debug.log("isOperaMobile=" + isOperaMobile);
  // scrolling doesn't change the result of getClientRects on iOS 7
  var isIOS7 = (/iP(hone|od|ad)/.test(navigator.platform) &&
    /OS 7[^\d]/.test(navigator.appVersion));
  debug.log("isIOS7=" + isIOS7);
  // prefix matchesSelector
  var prefixedMatchesSelector = 'matches' in Element.prototype ?
    'matches' : 'webkitMatchesSelector' in Element.prototype ?
      'webkitMatchesSelector' : 'mozMatchesSelector' in Element.prototype ?
        'mozMatchesSelector' : 'oMatchesSelector' in Element.prototype ?
          'oMatchesSelector' : 'msMatchesSelector';

  debug.log("prefixedMatchesSelector=" + prefixedMatchesSelector);

  function blank() { }

  function isElement(o) {
    if (!o || (typeof o !== 'object')) {
      return false;
    }

    var _window = getWindow(o) || window;

    return (/object|function/.test(typeof _window.Element) ?
      o instanceof _window.Element //DOM2
      :
      o.nodeType === 1 && typeof o.nodeName === "string");
  }

  function isWindow(thing) {
    return thing === window || !!(thing && thing.Window) && (thing instanceof thing.Window);
  }

  function isDocFrag(thing) {
    return !!thing && thing instanceof DocumentFragment;
  }

  function isArray(thing) {
    return isObject(thing) &&
      (typeof thing.length !== undefined) &&
      isFunction(thing.splice);
  }

  function isObject(thing) {
    return !!thing && (typeof thing === 'object');
  }

  function isFunction(thing) {
    return typeof thing === 'function';
  }

  function isNumber(thing) {
    return typeof thing === 'number';
  }

  function isBool(thing) {
    return typeof thing === 'boolean';
  }

  function isString(thing) {
    return typeof thing === 'string';
  }

  var hypot = Math.hypot || function (x, y) { return Math.sqrt(x * x + y * y); };

  function trySelector(value) {
    if (!isString(value)) {
      return false;
    }

    // an exception will be raised if it is invalid
    document.querySelector(value);
    return true;
  }

  function extend(dest, source) {
    for (var prop in source) {
      dest[prop] = source[prop];
    }
    return dest;
  }
  //------------------------------------------------------------------------------------------------------------


  function getRondom(max) {
    var min = 0; //,max = 150;
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function objectFindByKey(array, key, value) {
    for (var i = 0; i < array.length; i++) {
      if (array[i][key] === value) {
        return array[i];
      }
    }
    return null;
  }

  function appendHtml(el, str) {
    var div = document.createElement('div');
    div.innerHTML = str;
    while (div.children.length > 0) {
      el.appendChild(div.children[0]);
    }
  }

  function prependHtml(el, str) {
    var div = document.createElement('div');
    div.innerHTML = str;
    while (div.children.length > 0) {
      if (el.firstChild != null) {
        el.insertBefore(div.children[0], el.firstChild);
      } else {
        el.appendChild(div.children[0]);
      }
    }
  }

  function preloadimg(url) {
    var _img = document.createElement('img');
    var newImg = new Image;
    newImg.onload = function () {
      _img.src = this.src;
    }
    newImg.src = url;
  }

  function CanvasState(canvas, selectionCanvas) {
    this.selectionCanvas = selectionCanvas;
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;
    this.canvas = canvas;
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
      this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
      this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
      this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
      this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
    }
    this.width = canvas.offsetWidth;
    this.height = canvas.offsetHeight;
    this.dragoffx = 0;
    this.dragoffy = 0;
    this.dragstart = false;
    this.dragging = false;
    this.selection = null;
    this.selectionbg = null;
    this.target = null;
    this.expectResize = -1;
    this.resizeing = false;
    this.resizestart = false;
    this.rotating = false;
    this.rotatestart = false;
    this.gesturing = false;
    this.preSel = {};
    this.preMouse = {};
    this.DEF_TouchPadding = 3;
    this.toCheckUp = true;

    this.gesture = {
      start: { x: 0, y: 0 },
      startDistance: 0,   // distance between two touches of touchStart
      prevDistance: 0,
      distance: 0,
      scale: 1,           // gesture.distance / gesture.startDistance
      startAngle: 0,      // angle of line joining two touches
      prevAngle: 0       // angle of the previous gesture event
    };

    this.lastminsize = {did:false,d:null/*direction*/};
    /*
    this.clicked = null;
    this.e = null;
    this.x = null;
    this.y = null;
    this.cx = null;
    this.cy = null;
    this.w = null;
    this.h = null;
    this.isMoving = null;
    */
    //  this.b = null;
  }
  CanvasState.prototype.getEvent = function (e) {
    /*   var b = e.target.getBoundingClientRect();
       this.cx = e.clientX;
       this.cy = e.clientY;
       this.x = e.clientX - b.left;
       this.y = e.clientY - b.top;
       this.w = b.width;
       this.h = b.height;
   */
    var point = null;
    if (e.type[0] == 'm') {
      point = this.getMouse(e);
    } else if (e.type[0] == 't') {
      point = this.getTouch(e);
    } else {
      debug.log(e.type + " event");
    }
    if(point.x < 0 ){
      point.x = 0;
    }
    if(point.y < 0){
      point.y = 0
    }
    if(point.x > this.width){
      point.x = this.width;
    }
    if(point.y > this.height){
      point.y = this.height;
    }
    return point;
  }
  CanvasState.prototype.getMouse = function (e) {
    var element = this.selectionCanvas,
      offsetX = 0,
      offsetY = 0,
      mx, my;
    // Compute the total offset
    if (element.offsetParent !== undefined) {
      do {
        offsetX += element.offsetLeft;
        offsetY += element.offsetTop;
      } while ((element = element.offsetParent));
    }
    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;

    // We return a simple javascript object (a hash) with x and y defined
    return {
      x: mx,
      y: my
    };
  }
  function getTouchPair(event) {
    var touches = [];

    // array of touches is supplied
    if (isArray(event)) {
      touches[0] = event[0];
      touches[1] = event[1];
    }
    // an event
    else {
      if (event.type === 'touchend') {
        if (event.touches.length === 1) {
          touches[0] = event.touches[0];
          touches[1] = event.changedTouches[0];
        }
        else if (event.touches.length === 0) {
          touches[0] = event.changedTouches[0];
          touches[1] = event.changedTouches[1];
        }
      }
      else {
        touches[0] = event.touches[0];
        touches[1] = event.touches[1];
      }
    }

    return touches;
  }
  function touchAnglex(event) {
    //deltaSource = deltaSource || defaultOptions.deltaSource;
    var showevent = {};
    extend(showevent, event);
    //console.log(showevent)
    var deltaSource = 'page'
    var sourceX = deltaSource + 'X',
      sourceY = deltaSource + 'Y',
      touches = getTouchPair(event);


    var dx = touches[0][sourceX] - touches[1][sourceX],
      dy = touches[0][sourceY] - touches[1][sourceY];

    return getDegree(Math.atan2(dy, dx));
  }
  function touchAngle(event, prevAngle) {
    //deltaSource = deltaSource || defaultOptions.deltaSource;
    var deltaSource = 'page'
    var sourceX = deltaSource + 'X',
      sourceY = deltaSource + 'Y',
      touches = getTouchPair(event),
      dx = touches[0][sourceX] - touches[1][sourceX],
      dy = touches[0][sourceY] - touches[1][sourceY],
      angle = 180 * Math.atan(dy / dx) / Math.PI;

    if (isNumber(prevAngle)) {
      var dr = angle - prevAngle,
        drClamped = dr % 360;

      if (drClamped > 315) {
        angle -= 360 + (angle / 360) | 0 * 360;
      }
      else if (drClamped > 135) {
        angle -= 180 + (angle / 360) | 0 * 360;
      }
      else if (drClamped < -315) {
        angle += 360 + (angle / 360) | 0 * 360;
      }
      else if (drClamped < -135) {
        angle += 180 + (angle / 360) | 0 * 360;
      }
    }

    return angle;
  }
  function touchDistance(event) {
    //deltaSource = deltaSource || defaultOptions.deltaSource;
    var showevent = {};
    extend(showevent, event);
    console.log(showevent)
    var deltaSource = 'page'
    var sourceX = deltaSource + 'X',
      sourceY = deltaSource + 'Y',
      touches = getTouchPair(event);


    var dx = touches[0][sourceX] - touches[1][sourceX],
      dy = touches[0][sourceY] - touches[1][sourceY];

    return hypot(dx, dy);
  }
  CanvasState.prototype.getGesture = function (e, prevAngle) {
    e.preventDefault(); //to skip 2nd event
    var length = 0;
    var d = 0;
    var a = 0;
    if (typeof e.originalEvent == "undefined") {
      length = e.touches.length;
      var touch = e.touches[0] || e.changedTouches[0];
      if (length > 1) {
        d = touchDistance(e);
        a = touchAngle(e, prevAngle);
        console.log("[A]touchDistance=" + d);
      }
    } else {
      length = e.originalEvent.touches.length;
      var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
      if (length > 1) {
        d = touchDistance(e.originalEvent);
        a = touchAngle(e.originalEvent, prevAngle);
        console.log("[B]touchDistance=" + d);
      }
    }
    return {
      l: length,
      d: d,
      a: a,
    };
  }
  CanvasState.prototype.getTouch = function (e) {
    e.preventDefault(); //to skip 2nd event

    var element = this.selectionCanvas,
      offsetX = 0,
      offsetY = 0,
      mx, my;

    // Compute the total offset
    if (element.offsetParent !== undefined) {
      do {
        offsetX += element.offsetLeft;
        offsetY += element.offsetTop;
      } while ((element = element.offsetParent));
    }

    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

    if (typeof e.originalEvent == "undefined") {
      var touch = e.touches[0] || e.changedTouches[0];
    } else {
      var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    }


    mx = touch.pageX - offsetX;
    my = touch.pageY - offsetY;
    //debug.log(mx+' '+my);

    return {
      x: mx,
      y: my
    };
  }
  CanvasState.prototype.checkGesture = function (e) {
    debug.log("checkGesture");
    debug.log("this.gesturing=" + this.gesturing);
    var gesture = this.getGesture(e, undefined);
    var isGestureEvent = false;
    if (gesture.l > 1) {
      isGestureEvent = true;

      if (this.gesturing == false) {
        gesture = this.getGesture(e, undefined);
        if (this.selection == null) {
          console.warn("There is not in selection")
          if (mySel != null) {
            this.selection = mySel;
          } else {
            console.warn("There is REALLY not in selection")
            return isGestureEvent;
          }
        }
        this.gesture.prevDistance = this.gesture.startDistance = gesture.d;
        this.gesture.startAngle = this.gesture.prevAngle = gesture.a;
        console.log("this.gesture.startDistance=" + this.gesture.startDistance);
        var preSel = objectFindByKey(shapes, 'selDomId', e.target.getAttribute('id'));
        extend(this.preSel, preSel);
        this.gesturing = true;
      } else {
        gesture = this.getGesture(e, this.gesture.prevAngle);
        if (e.target != null && e.target.getAttribute('id') !== null && e.target.classList.contains('selshape') && this.selection.selDomId != e.target.getAttribute('id')) {
          console.warn("[G]Selection is diffenet from now - this.gesturing=false");
          console.log("[G]this.selection.selDomId=" + this.selection.selDomId);
          console.log("[G]e.target.getAttribute('id')=" + e.target.getAttribute('id'));
          //this.gesturing = false;
          //return isGestureEvent;
        }
        this.gesture.distance = gesture.d;
        console.log("this.gesture.distance=" + this.gesture.distance);
        var scale = (this.gesture.distance / this.gesture.prevDistance);
        if (scale == Infinity || scale == 0) {
          console.warn("SCALE=" + scale + " is wrong!!!!!!!!!")
        } else {
          console.warn("SCALE=" + scale);
          var oldx = this.selection.x;
          var oldy = this.selection.y;
          var oldx_w = this.selection.x + this.selection.w;
          var oldy_h = this.selection.y + this.selection.h;
          var oldw = this.selection.w;
          var oldh = this.selection.h;
          var fixright = true;
          var fixbottom = true;
          var r = this.selection.r;
          this.selection.w = parseFloat(scale * this.selection.w);// parseFloat((scale * this.preSel.w).toFixed(2));
          this.selection.h = parseFloat(scale * this.selection.h);//parseFloat((scale * this.preSel.h).toFixed(2));
          this.selection.x = this.selection.x - (this.selection.w - oldw) * 0.5;
          this.selection.y = this.selection.y - (this.selection.h - oldh) * 0.5;

          if (this.selection.w < 1) {
            this.selection.w = 1;
            this.selection.x = oldx_w - 1;
          }
          if (this.selection.h < 1) {
            this.selection.h = 1;
            this.selection.y = oldy_h - 1;
          }

          if (this.selection.w < 5 && this.selection.h < 5) {
            this.selection.w = this.selection.h = 5;
            this.selection.x = oldx_w - 5;
            this.selection.y = oldy_h - 5;
          }

          if (this.selection.x < 5) {
            this.selection.x = 0;
          }
          if (this.selection.y < 5) {
            this.selection.y = 0;
          }

          if ((this.selection.x + this.selection.w) > this.width - 5) {
            this.selection.w = this.width - this.selection.x;

          }
          if ((this.selection.y + this.selection.h) > this.height - 5) {
            this.selection.h = this.height - this.selection.y;
          }
          r = r + (gesture.a - this.gesture.prevAngle);
          this.selection.r = r;
          this.selection.setPosition();
          this.gesture.prevDistance = this.gesture.distance;
          this.gesture.prevAngle = gesture.a;
        }
      }
    }

    return (this.gesturing || isGestureEvent);
  };
  CanvasState.prototype.onDown = function (e) {
    //this.getEvent(e);
    debug.log("onDown")
    debug.log("e.target.getAttribute('id')=" + e.target.getAttribute('id'));
    if (e.target.classList.contains('rotate-handle') ||
      (e.type == "touchstart" && e.target.classList.contains('rotatebig-handle'))) {
      debug.log("rotate start");
      debug.log(e.target.parentNode.parentNode.getAttribute('id'));
      this.rotatestart = true;
      this.resizestart = false;
      this.dragstart = false;
      if (mySel) document.querySelector('#' + mySel.selDomId + ' .rotate-handle').classList.add('rotate-handle-active');
    } else
      if (e.target.classList.contains('resize-handle') ||
        (e.type == "touchstart" && e.target.classList.contains('resizebig-handle'))) {
        debug.log("resize start");
        debug.log(e.target.parentNode.parentNode.getAttribute('id'));
        this.rotatestart = false;
        this.resizestart = true;
        this.dragstart = false;
        this.expectResize = e.target.getAttribute("resizehandler");
      } else if (e.target.classList.contains('selshape')) {
        this.rotatestart = false;
        this.dragstart = true;
        this.resizestart = false;
        debug.log("drag start");
        var mouse = this.getEvent(e);
        var preSel = objectFindByKey(shapes, 'selDomId', e.target.getAttribute('id'));
        this.dragoffx = mouse.x - preSel.x;
        this.dragoffy = mouse.y - preSel.y;
        this.target = e.target;
        extend(this.preMouse, mouse);
        extend(this.preSel, preSel);
      } else {
        debug.log("Unknown event")
        debug.log(e.target.classList);
        return;
      }
  }
  CanvasState.prototype.checkSelection = function (e) {
    if (e.target.classList.contains('selshape')) {
      if (this.selection && !this.dragging && !this.resizing && !this.gesturing && this.selection.selDomId === e.target.getAttribute('id')) {
        console.warn("case 1 - clear selection");
        build.clearSelection();
        this.selection = null;
        this.target.style.cursor = 'auto';
        this.target = null;
      } else if (this.selection == null || this.selection.selDomId != e.target.getAttribute('id')) {
        console.warn("case 2 - set selection");
        this.selection = build.setSelection(e.target.getAttribute('id'));
        this.selection.bringToFrontOnSelection();
        this.target = e.target;
        this.target.style.cursor = 'move';
      }
    }
  }
  CanvasState.prototype.onUp = function (e) {
    debug.log("onUp");
    /*
    if (e.type[0] == "m") { // if mouseup
      this.checkSelection(e);
    }
    */
    if (this.rotating || this.rotatestart) {
      if (mySel) document.querySelector('#' + mySel.selDomId + ' .rotate-handle').classList.remove('rotate-handle-active');
    }
    if (!this.gesturing) this.checkSelection(e);
    if (this.dragging == true) {
      //mySel.seldom.style.cursor = 'auto';
    }
    this.dragstart = false;
    this.dragging = false;
    this.resizeing = false;
    this.resizestart = false;
    this.rotating = false;
    this.rotatestart = false;
    this.gesturing = false;
    this.lastminsize.did = false;
  }
  CanvasState.prototype.onEscapeUp = function (e) {
    debug.log("onEscapeUp");
    if (this.dragging == true) {
      //mySel.seldom.style.cursor = 'auto';
    }
    if (this.rotating || this.rotatestart) {
      if (mySel) document.querySelector('#' + mySel.selDomId + ' .rotate-handle').classList.remove('rotate-handle-active');
    }
    //this.dragstart = false;
    this.dragging = false;
    this.resizeing = false;
    this.resizestart = false;
    this.gesturing = false;
    this.rotating = false;
    this.rotatestart = false;
    this.lastminsize.did = false;
  }
  CanvasState.prototype.onMove = function (e) {
    var mouse = this.getEvent(e);
    debug.log("onMove")
    debug.log("onMove this.dragstart=" + this.dragstart)
    debug.log("onMove this.resizestart=" + this.resizestart)
    debug.log("onMove this.rotatestart=" + this.rotatestart)

    if (this.dragstart || this.resizestart || this.rotatestart) {
      if (this.dragstart) {
        if (this.selection == null) {
          console.warn("There is not in selection")
          if (mySel != null) {
            this.selection = mySel;
          } else {
            console.warn("There is REALLY not in selection")
            return;
          }

        } else if (e.target != null && e.target.getAttribute('id') !== null && e.target.classList.contains('selshape') && this.selection.selDomId != e.target.getAttribute('id')) {
          console.warn("Selection is diffenet from now - this.dragstart=false");
          console.log("this.selection.selDomId=" + this.selection.selDomId);
          console.log(" e.target.getAttribute('id')=" + e.target.getAttribute('id'));
          if(this.dragging !== true)
            this.dragstart = false;
          return;
        }

        if (e.type[0] == 't' && !this.dragging) {
          if (Math.abs(mouse.x - this.preMouse.x) < this.DEF_TouchPadding && Math.abs(mouse.y - this.preMouse.y) < this.DEF_TouchPadding) {
            console.warn("Skip this touch move");
            return;
          }

        }
        /*Can't not drag while not in foucs
        if (this.selection == null || this.selection.selDomId != e.target.getAttribute('id')) {
          console.warn("check selection")
          this.selection = build.setSelection(e.target.getAttribute('id'));
          this.selection.bringToFront();
          this.target = e.target;
        }
        */
      }
      var target = this.target,
        x = (parseFloat(target.getAttribute('data-x')) || 0),
        y = (parseFloat(target.getAttribute('data-y')) || 0),
        r = (parseFloat(target.getAttribute('data-r')) || 0),
        scale = (parseFloat(target.getAttribute('data-scale')) || 1),
        w = (parseFloat(target.style.width) || 0),
        h = (parseFloat(target.style.height) || 0);

        var oldx = this.selection.x;
        var oldy = this.selection.y;
        var oldx_w = this.selection.x + this.selection.w;
        var oldy_h = this.selection.y + this.selection.h;
        var oldw = this.selection.w;
        var oldh = this.selection.h;
    }

    if (this.dragstart) {
      //this.target.style.cursor = 'move';
      this.dragging = true;

      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      this.selection.x = mouse.x - this.dragoffx;
      this.selection.y = mouse.y - this.dragoffy;


      //limited by mouse
      /*
      if(mouse.x < 0 ){
        this.selection.x = oldx;
      }
      if(mouse.y < 0){
        this.selection.y = oldy;
      }
      if(mouse.x > this.width){
        this.selection.x = oldx;
      }
      if(mouse.y > this.height){
        this.selection.y = oldy;
      }
      */
      // limited in region 
      if(this.selection.r === 0){
        if (this.selection.x < 0) {
          this.selection.x = 0;
        }
        if (this.selection.x < 0 || this.selection.y < 0) {
          this.selection.y = 0;
        }

        if ((this.selection.x + this.selection.w) > this.width) {
          this.selection.x = this.width - this.selection.w;
        }
        if ((this.selection.y + this.selection.h) > this.height) {
          this.selection.y = this.height - this.selection.h;
        }
      }
      this.selection.setPosition();
      debug.log("noMove end")
    } else if (this.resizestart) {

      var r = this.selection.r;

      if (r === 0) {
        s.dragstart = false;
        s.dragging = false;
        s.resizeing = true;

        // 0  1  2   // tl   top  tr
        // 3     4   // left  c   right
        // 5  6  7   // bl  bottom  br
        var fixright = false;
        var fixtop = false;
        var fixbottom = false;
        var fixleft = false;
        debug.log("this.expectResize=" + this.expectResize)
        switch (this.expectResize) {
          case 0:
          case 'tl':
            this.selection.x = mouse.x;
            this.selection.y = mouse.y;
            this.selection.w += oldx - this.selection.x;
            this.selection.h += oldy - this.selection.y;
            fixright = true;
            fixbottom = true;
            break;
          case 1:
          case 'top':
            this.selection.y = mouse.y;
            this.selection.h += oldy - mouse.y;
            fixbottom = true;
            break;
          case 2:
          case 'tr':
            this.selection.y = mouse.y;
            this.selection.w = mouse.x - oldx;
            this.selection.h += oldy - mouse.y;
            fixbottom = true;
            break;
          case 3:
          case 'left':
            this.selection.x = mouse.x;
            this.selection.w += oldx - mouse.x;
            fixright = true;
            break;
          case 4:
          case 'right':
            this.selection.w = mouse.x - oldx;
            break;
          case 5:
          case 'bl':
            this.selection.x = mouse.x;
            this.selection.w += oldx - mouse.x;
            this.selection.h = mouse.y - oldy;
            fixright = true;
            break;
          case 6:
          case 'bottom':
            this.selection.h = mouse.y - oldy;
            break;
          case 7:
          case 'br':
            this.selection.w = mouse.x - oldx;
            this.selection.h = mouse.y - oldy;
            break;
        }
        if (this.selection.w < 1) {
          this.selection.w = 1;
          this.selection.x = (fixright == true) ? oldx_w - 1 : oldx;
        }
        if (this.selection.h < 1) {
          this.selection.h = 1;
          this.selection.y = (fixbottom == true) ? oldy_h - 1 : oldy;
        }

        if (this.selection.w < 5 && this.selection.h < 5) {
          this.selection.w = this.selection.h = 5;
          this.selection.x = (fixright == true) ? oldx_w - 5 : oldx;
          this.selection.y = (fixbottom == true) ? oldy_h - 5 : oldy;
        }
        if (fixright && this.selection.x < 5) {
          this.selection.x = 0;
          this.selection.w = oldx_w - this.selection.x;
        }
        if (fixbottom && this.selection.y < 5) {
          this.selection.y = 0;
          this.selection.h = oldy_h - this.selection.y;
        }
        if ((this.selection.x + this.selection.w) > this.width - 5) {
          this.selection.w = this.width - this.selection.x;

        }
        if ((this.selection.y + this.selection.h) > this.height - 5) {
          this.selection.h = this.height - this.selection.y;
        }
      } else {
        s.dragstart = false;
        s.dragging = false;
        s.resizeing = true;
        s.rotatestart = false;
        s.rotating = false;

        var change = { x: 0, y: 0 };
        var xMin = this.selection.x;
        var xMax = this.selection.x + this.selection.w;
        var yMin = this.selection.y;
        var yMax = this.selection.y + this.selection.h;
        var p_tl = { x: xMin, y: yMin };
        var p_tr = { x: xMax, y: yMin };
        var p_br = { x: xMax, y: yMax };
        var p_bl = { x: xMin, y: yMax };
        var p_lc = { x: xMin, y: yMin + (yMax - yMin) / 2 };
        var p_rc = { x: xMax, y: yMin + (yMax - yMin) / 2 };
        var p_tc = { x: xMin + (xMax - xMin) / 2, y: yMin };
        var p_bc = { x: xMin + (xMax - xMin) / 2, y: yMax };
        var _center = calcMidPoint(p_tl, p_br); //{ x: old_cx, y: old_cy };

        p_tl = calcRotate(r, p_tl, _center);
        p_tr = calcRotate(r, p_tr, _center);
        p_br = calcRotate(r, p_br, _center);
        p_bl = calcRotate(r, p_bl, _center);
        p_lc = calcRotate(r, p_lc, _center);
        p_rc = calcRotate(r, p_rc, _center);
        p_tc = calcRotate(r, p_tc, _center);
        p_bc = calcRotate(r, p_bc, _center);

        var cursor = calcRotate(360 - r, mouse, _center);
        var direction = this.expectResize;

        var origins = {
          tl: p_br,
          tr: p_bl,
          br: p_tl,
          bl: p_tr,
          top: p_bc,
          right: p_lc,
          bottom: p_tc,
          left: p_rc
        };
        var origin = origins[direction];

        if (["tr", "right", "br"].indexOf(direction) != -1) {
          change.x = cursor.x - calcRotate(360 - r, p_rc, _center).x;
        }
        if (["tl", "left", "bl"].indexOf(direction) != -1) {
          change.x = calcRotate(360 - r, p_lc, _center).x - cursor.x;
        }
        if (["tl", "top", "tr"].indexOf(direction) != -1) {
          change.y = calcRotate(360 - r, p_tc, _center).y - cursor.y;
        }
        if (["bl", "bottom", "br"].indexOf(direction) != -1) {
          change.y = cursor.y - calcRotate(360 - r, p_bc, _center).y;
        }
        var change_ratio_x = calcChangePercent(change.x, oldw);
        var change_ratio_y = calcChangePercent(change.y, oldh);

        console.log("x changes in " + change.x + " px (" + change_ratio_x + ")%");
        console.log("y changes in " + change.y + " px (" + change_ratio_y + ")%");

        //calculate new center and top-left point
        var new_center = doScale(change_ratio_x, change_ratio_y, r, p_tl, p_br, oldw, oldh, _center, origin);
        var new_tl = calcRotate(360 - r, new_center.tl, new_center);//for new center

        var new_w = new_center.width;
        var new_h = new_center.height;
        var new_x = new_tl.x;
        var new_y = new_tl.y;

       
        // ** check minsize direction **/
        var minsize = 1;
        var min_d = "";
        if(new_w <= minsize){
          min_d += "w";
        }
        if(new_h <= minsize){
          min_d += "h";
        }
        
        if(this.lastminsize.did === true){
          if(this.lastminsize.d !== min_d ){
            this.lastminsize.did = false;
            console.log("lastminsize reset!");
          }
        }
        if(min_d!=="") 
            this.lastminsize.d = min_d;   
        // ** end of check minsize direction **/
        
        var minsize_ratio_x = change_ratio_x;
        var minsize_ratio_y = change_ratio_y;

        if (new_w <= minsize || new_h <=  minsize) {
          if (new_w <= minsize) {
            if(this.lastminsize.did === false){
              console.log("lastminsize w")
              minsize_ratio_x = minsize/oldw;
            }else{
              minsize_ratio_x = 1;
            }
          }
          if (new_h <= minsize) {
            if(this.lastminsize.did === false){
              console.log("lastminsize h")
              minsize_ratio_y = minsize/oldh;
            }else{
              minsize_ratio_y = 1;
            }
          }
          this.lastminsize.did = true;
        }
        if(min_d!==""){
          new_center = doScale(minsize_ratio_x, minsize_ratio_y, r, p_tl, p_br, oldw, oldh, _center, origin);
          new_tl = calcRotate(360 - r, new_center.tl, new_center);//for new center
          new_w = new_center.width;
          new_h = new_center.height;
          new_x = new_tl.x;
          new_y = new_tl.y;
        }
        this.selection.w = new_w;
        this.selection.h = new_h;
        this.selection.x = new_x;
        this.selection.y = new_y;
      }
      this.selection.setPosition();
    } else if (this.rotatestart) {
      s.dragstart = false;
      s.dragging = false;
      s.resizeing = false;
      s.rotating = true;

      var oldx_w = this.selection.x + this.selection.w;
      var oldy_h = this.selection.y + this.selection.h;
      var old_cx = this.selection.x + this.selection.w * 0.5;
      var old_cy = this.selection.y + this.selection.h * 0.5;
      var diffx = mouse.x - old_cx;
      var diffy = mouse.y - old_cy;
      var deg = 90 + getDegree(Math.atan2(diffy, diffx));
      this.selection.r = deg;
      this.selection.setPosition();
      this.selection.updateGripCursors();
    }
  }

  CanvasState.prototype.onHover = function (e) {
    debug.log("onHover");
  }
  CanvasState.prototype.onLeave = function (e) {
    debug.log("onLeave");
  }
  CanvasState.prototype.onMouseHover = function (e) {
    s.onHover(e);
    e.stopPropagation();
  }
  CanvasState.prototype.onMouseLeave = function (e) {
    s.onLeave(e);
    e.stopPropagation();
  }
  CanvasState.prototype.onMouseDown = function (e) {
    s.onDown(e);
    e.stopPropagation();
  }
  CanvasState.prototype.onMouseMove = function (e) {
    s.onMove(e);
    e.stopPropagation();
  }
  CanvasState.prototype.onMouseUp = function (e) {
    s.onUp(e);
    e.stopPropagation();
  }

  CanvasState.prototype.onTouchDown = function (e) {
    if (!s.checkGesture(e)) {
      s.onDown(e);
    }
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
  CanvasState.prototype.onTouchMove = function (e) {
    if (!s.checkGesture(e)) {
      s.onMove(e);
    }
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
  CanvasState.prototype.onTouchEnd = function (e) {
    s.checkGesture(e);
    if (s.gesturing == true) {
      s.toCheckUp = false;
      s.onUp(e);
      s.gesturing = false;
      setTimeout(function () {
        s.toCheckUp = true;
      }, 100);
    }
    if (s.toCheckUp == true) {
      s.onUp(e);
    } else {
      console.warn("skip a mouse up");
    }

    e.stopPropagation();
    e.stopImmediatePropagation();
  }
  CanvasState.prototype.GetZindexArray = function() {
      var shapesZidx = new Array();
      for(var i=0;i<shapes.length;i++)
      {
        shapesZidx[i] = shapes[i].zIndex;
      }
      return shapesZidx;
  };
  CanvasState.prototype.bringToFront = function () {
    var shapeId = this.selection.id;
    var modifyShape = objectFindByKey(shapes,'id',shapeId);
    var modifyShapeZidx = modifyShape.zIndex;
    var switchShapeZidx = modifyShapeZidx;
    //var switchShapeId = shapeId;
    //collect all overlap shapes with this shape
    var overlapShapes = new Array();
    var x=0;
    for(var i=0;i<shapes.length;i++)
    {
      var os = shapes[i];
      var find = false;
      if(modifyShape.overlap(os))
      {
        overlapShapes[x] = shapes[i].zIndex;
        x++;
      }
    }
    console.log("overlapShapes=")
    console.log(overlapShapes)
    //find next shape with Zindex is bigger than this shape
    /*
    var shapesZidx = new Array();
    for(var i=0;i<shapes.length;i++)
    {
      shapesZidx[i] = shapes[i].zIndex;
    }
    */
    var shapesZidx = overlapShapes;
    shapesZidx.sort(function(a, b){return a-b});
    for(var i=0;i<shapesZidx.length;i++)
    {
      if(modifyShapeZidx<shapesZidx[i])
      {
        switchShapeZidx = shapesZidx[i];
        break;
      }
    }

    // Switch Zidx
    var ZindexArray = this.GetZindexArray();
    console.log("ZindexArray=")
    console.log(ZindexArray);
    var to = ZindexArray.indexOf(switchShapeZidx);
    var from = ZindexArray.indexOf(modifyShapeZidx);
    console.log('from='+modifyShapeZidx+' to='+switchShapeZidx)
    if(from!=-1 && to!=-1 && modifyShapeZidx < switchShapeZidx)
    {
      ZindexArray[from] = switchShapeZidx;
      for(var i=0;i<ZindexArray.length;i++)
      {
        if(ZindexArray[i]>=modifyShapeZidx && ZindexArray[i]<=switchShapeZidx && i!=from)
        {
          ZindexArray[i]--;
        }
      }
      console.log(ZindexArray);

      for(var n=0;n<shapes.length;n++)
      {
        var shape = shapes[n];
        shape.zIndex = ZindexArray[n];
        shape.canvasdom.setAttribute('zidx',shape.zIndex);
        shape.seldom.setAttribute('zidx',shape.zIndex);
      }
    }else{
      console.warn("no zIndex need change!");
    }
    dom_canvasMain.sortDom(".shape", function (a, b) {
        if (parseInt(a.getAttribute('zidx')) > parseInt(b.getAttribute('zidx'))) {
          return 1;
        } else {
          return -1;
        }
      });
  }
  CanvasState.prototype.sendToBack = function () {
    var shapeId = this.selection.id;
    var modifyShape = objectFindByKey(shapes,'id',shapeId);
    var modifyShapeZidx = modifyShape.zIndex;
    var switchShapeZidx = modifyShapeZidx;
    //var switchShapeId = shapeId;
    //collect all overlap shapes with this shape
    var overlapShapes = new Array();
    var x=0;
    for(var i=0;i<shapes.length;i++)
    {
      var os = shapes[i];
      var find = false;
      if(modifyShape.overlap(os))
      {
        overlapShapes[x] = shapes[i].zIndex;
        x++;
      }
    }
    console.log("overlapShapes=")
    console.log(overlapShapes)

    //find next shape with Zindex is bigger than this shape
    /*
    var shapesZidx = new Array();
    for(var i=0;i<shapes.length;i++)
    {
      shapesZidx[i] = shapes[i].zIndex;
    }
    */
    var shapesZidx = overlapShapes;
    shapesZidx.sort(function(a, b){return b-a});
    for(var i=0;i<shapesZidx.length;i++)
    {
      if(modifyShapeZidx>shapesZidx[i])
      {
        switchShapeZidx = shapesZidx[i];
        break;
      }
    }

    // Switch Zidx
    var ZindexArray = this.GetZindexArray();
    console.log("ZindexArray=")
    console.log(ZindexArray);

    var to = ZindexArray.indexOf(switchShapeZidx);
    var from = ZindexArray.indexOf(modifyShapeZidx);
    console.log('from='+modifyShapeZidx+' to='+switchShapeZidx)
    if(from!=-1 && to!=-1 && modifyShapeZidx > switchShapeZidx)
    {
      ZindexArray[from] = switchShapeZidx;
      for(var i=0;i<ZindexArray.length;i++)
      {
        if(ZindexArray[i]>=switchShapeZidx && ZindexArray[i]<=modifyShapeZidx && i!=from)
        {
          ZindexArray[i]++;
        }
      }
      console.log(ZindexArray);

      for(var n=0;n<shapes.length;n++)
      {
        var shape = shapes[n];//objectFindByKey(shapes,'zIndex',ZindexArray[n]);
        //console.log(shape.zIndex+"-->"+(n+1));
        shape.zIndex = ZindexArray[n];
        shape.canvasdom.setAttribute('zidx',shape.zIndex);
        shape.seldom.setAttribute('zidx',shape.zIndex);
      }
    }

    dom_canvasMain.sortDom(".shape", function (a, b) {
        if (parseInt(a.getAttribute('zidx')) > parseInt(b.getAttribute('zidx'))) {
          return 1;
        } else {
          return -1;
        }
      });
  }

  function Shape(id, type, x, y, w, h, fill, zindex) {
    this.id = id || (Math.floor(Math.random() * 1000000000));
    this.selDomId = 'selshape-' + id;
    this.canvasDomId = 'shape-' + id;
    this.type = type || 'undefind';
    this.x = x || 0;
    this.y = y || 0;
    this.w = w || 1;
    this.h = h || 1;
    this.fill = fill || '#AAAAAA';
    this.datacount = 0;
    this.zIndex = parseInt(zindex);
    this.r = 0;
    this.rt = 0;
    this.scale = 1;
    this.data = null;
    this.seldom = null;
    this.canvasdom = null;
    this.editable = null;
    this.draggable = null;
    this.resizable = null;

  };
  Shape.prototype.add = function (shape) {
    shapes.push(shape);
    var selshapehtml = '<div id="selshape-' + this.id + '" zidx="' + this.id + '" class="selshape"><div id="rotate-' + this.id + '" class="rotate-handler"></div><div id="resize-' + this.id + '" class="resize-handlers"></div></div>';
    appendHtml(dom_dragMain, selshapehtml);
    this.seldom = document.getElementById('selshape-' + this.id);
    var shapehtml = '<div id="shape-' + this.id + '" class="shape" zidx="' + this.zIndex + '"></div>';
    appendHtml(dom_canvasMain, shapehtml);
    this.canvasdom = document.getElementById('shape-' + this.id);
    this.draw();
    // Mouse events
    this.seldom.addEventListener('mouseover', s.onMouseHover, true);
    this.seldom.addEventListener('mouseleave', s.onMouseLeave, true);
    this.seldom.addEventListener('mousedown', s.onMouseDown, true);
    this.seldom.addEventListener('mousemove', s.onMouseMove, true);
    this.seldom.addEventListener('mouseup', s.onMouseUp, true);

    // Touch events	
    this.seldom.addEventListener('touchstart', s.onTouchDown, true);
    this.seldom.addEventListener('touchmove', s.onTouchMove, true);
    this.seldom.addEventListener('touchend', s.onTouchEnd, true);
  };
  Shape.prototype.draw = function () {
    this.setPosition();
    if (this.type == "image" && this.data != null) {
      this.fillColor = 'transparent';
      this.drawImage();
    }
  };
  Shape.prototype.setPosition = function () {
    this.updateSelectionPos();
    this.realtimeUpdatePos();
  };
  Shape.prototype.updateSelectionPos = function (){
    var seldom = this.seldom;
    seldom.style.width = this.w + 'px';
    seldom.style.height = this.h + 'px';
    //seldom.style.backgroundColor = this.fill;
    seldom.style.webkitTransform = seldom.style.transform =
      'scale(' + this.scale + ') translate(' + this.x + 'px,' + this.y + 'px) rotate(' + this.r + 'deg)';
    seldom.setAttribute('data-x', this.x);
    seldom.setAttribute('data-y', this.y);
    seldom.setAttribute('data-r', this.r);
    seldom.setAttribute('data-scale', this.scale);
  };
  Shape.prototype.realtimeUpdatePos = function () {
    var dom = this.canvasdom;
    dom.style.width = this.w + 'px';
    dom.style.height = this.h + 'px';
    dom.style.webkitTransform = dom.style.transform =
      'scale(' + this.scale + ') translate(' + this.x + 'px,' + this.y + 'px) rotate(' + this.r + 'deg)';
  };
  Shape.prototype.updateGripCursors = function() {
    var id = this.selDomId;
    var angle = this.r;
    var selectorGrips = {
        'nw' : 'tl', //-45 //315
        'n' : 'top', //0
        'ne': 'tr',  //45
        'e': 'right', //90
        'se': 'br',  //135
        's' : 'bottom', //180
        'sw' : 'bl',  //225
        'w' : 'left'  //270        
    }
    var dir_arr = [];
    var steps = Math.round(angle / 45);
    if(steps < 0) steps += 8;
    for (var dir in selectorGrips) {
      dir_arr.push(dir);
    }
    while(steps > 0) {
      dir_arr.push(dir_arr.shift());
      steps--;
    }
    var i = 0;
    for (var dir in selectorGrips) {
      console.log("resizeHandlers["+dir+"]="+selectorGrips[dir])
      document.querySelector("#" + id + " .resize-handle[resizehandler='"+selectorGrips[dir]+"']").setAttribute('style', ('cursor:' + dir_arr[i] + '-resize'));
      i++;
    };
  };
  Shape.prototype.drawImage = function () {
    var dom_data = this.canvasdom.querySelector(".elm_data");
    debug.log("dom_data=" + dom_data);
    if (dom_data == null) {
      var inshtml = '<img class="elm_data" src="' + this.data + '"/>';
      prependHtml(this.canvasdom, inshtml);
    } else {
      dom_data.setAttribute('src', this.data);
    }
  };
  Shape.prototype.setData = function (data) {
    this.data = data;
    this.draw();
  };
  Element.prototype.sortDom = function (selector, sortBy) {
    var items = this.querySelectorAll(selector);
    debug.log("---------------------->")
    debug.log(items)
    if (items.length > 0) {
      var list = items[0].parentNode;
      var itemsArr = [];
      for (var i in items) {
        if (items[i].nodeType == 1) { // get rid of the whitespace text nodes
          itemsArr.push(items[i]);
        }
      }
      debug.log(itemsArr)
      itemsArr.sort(sortBy);
      debug.log(itemsArr)
      for (i = 0; i < itemsArr.length; ++i) {
        list.appendChild(itemsArr[i]);
      }
    }
  };
  Shape.prototype.bringToFrontOnSelection = function () {

    var c = 1;
    [].forEach.call(dom_dragMain.querySelectorAll(".selshape"), function (el, i) {
      el.setAttribute('orderidx', c);
      c++;
    });
    var d = this;
    dom_dragMain.sortDom(".selshape", function (a, b) {
      debug.log("a.id=" + a.id);
      debug.log("b.id=" + b.id);
      debug.log("d.selDomId=" + d.selDomId);
      if (a.id === d.selDomId) {
        return 1;
      } else {
        if (b.id === d.selDomId) {
          return -1;
        } else {
          debug.log("parseInt(a.getAttribute('orderidx'))=" + parseInt(a.getAttribute('orderidx')));
          debug.log("parseInt(b.getAttribute('orderidx'))=" + parseInt(b.getAttribute('orderidx')));
          if (parseInt(a.getAttribute('orderidx')) > parseInt(b.getAttribute('orderidx'))) {
            return 1;
          } else {
            return -1;
          }
        }
      }
    });
    var c2 = 1;
    [].forEach.call(dom_dragMain.querySelectorAll(".selshape"), function (el, i) {
      el.setAttribute('orderidx', c2);
      c2++;
    });

  };
  Shape.prototype.overlap = function(compareShape) {
    return checkOverlap(this, [compareShape] , null, 0);
  }
  Shape.prototype.rotate = function (degree) {
    this.rt = degree;
    var r = 0;
    if (degree != null && degree != "") {
      r = parseFloat(degree);
      r = (r + 360) % 360;
    }
    this.r = r;
    this.draw();
  };
  var build = function () {
    build.bindListener();
    return this;
  };

  function getPosition(element) {
    var x = 0;
    var y = 0;
    while (element) {
      x += element.offsetLeft - element.scrollLeft + element.clientLeft;
      y += element.offsetTop - element.scrollLeft + element.clientTop;
      element = element.offsetParent;
    }
    return {
      x: x,
      y: y
    };
  }

  function addListenerMulti(el, s, fn, useCapture) {
    //  s.split(' ').forEach(e => el.addEventListener(e, fn, useCapture)); // for iOS10 up
    var e = s.split(' ');
    for (var i = 0, l = e.length; i < l; i++) {
      el.addEventListener(e[i], fn, useCapture);
    }
  }
  build.bindListener = function () {
    // target elements with the "draggable" class
    preloadimg('img/handlerpin10.fw.png');
    addListenerMulti(dom_dragMain, "mousedown touchstart", function (e) {
      debug.log("editorwrapper is clicked!");
      s.dragging = null;
      s.dragstart = null;
      s.resizeing = null;
      s.resizestart = null;
      if (mySel) mySel.seldom.style.cursor = 'auto';

      setTimeout(function () {
        if (s.gesturing == false) {
          build.clearSelection();
          s.selection = null;
          s.target = null;
        }
      }, 100);

      if (e.type[0] == 't') {
        e.preventDefault();
      }
    }, false /* useCapture */);
    addListenerMulti(dom_dragMain, "mousemove", function (e) {
      if (s.dragging == true || s.resizeing == true || s.rotating == true) {
        debug.log("escape move event");
        s.onMove(e);
      }
    }, false /* useCapture */);
    addListenerMulti(dom_dragMain, "mouseup", function (e) {
      if (s.dragging == true || s.resizeing == true || s.gesturing == true || s.rotating == true) {
        debug.log("escape up event");
        s.onEscapeUp(e);
      }
    }, false /* useCapture */);
    addListenerMulti(dom_dragMain, "touchend", function (e) {
      if (s.dragging == true || s.resizeing == true || s.gesturing == true || s.rotating == true) {
        debug.log("escape touchend event");
        s.onTouchEnd(e);
      }
    }, false /* useCapture */);
    addListenerMulti(dom_dragMain, "mouseleave", function (e) {
      if (s.dragging == true) {
        debug.log("escape leave event");
        //s.onEscapeUp(e);
      }
    }, false /* useCapture */);
    addListenerMulti(dom_dragMain, "touchmove", function (e) {
      if (s.selection != null) {
        debug.log("escape move event");
        s.onTouchMove(e);
      }
    }, false /* useCapture */);
  }
  build.mySel = function () {
    //return mySel;
    if (mySel !== null) {
      return [mySel];
    } else if (parseInt(multiSel.length) > 0) {
      return multiSel;
    } else {
      return null;
    }
  };
  build.setSelection = function (thisSelId) {
    debug.log("thisSelId=" + thisSelId)
    if (thisSelId == null) {
      return null;
    }
    var old_mySel_id = ((mySel === null) ? 0 : mySel.selDomId);

    if (old_mySel_id !== thisSelId) {
      build.clearSelection();
      mySel = objectFindByKey(shapes, 'selDomId', thisSelId);
      build.drawSelection();
      debug.log("thisSelId=" + thisSelId)
    }
    return mySel;
  }
  // 0  1  2   // tl   top  tr      // nw   n   ne
  // 3     4   // left  c   right   // s        e
  // 5  6  7   // bl  bottom  br    // sw   s   se
  build.drawSelection = function () {
    if (mySel !== null) {
      document.getElementById(mySel.selDomId).classList.add('selshape_active');
      var elm_resize_handlers = document.querySelector('#' + mySel.selDomId + ' .resize-handlers');
      if (supportsTouch == true) {
        var html_resize_handler_big = '<div id="resizebig-' + mySel.id + '-0" resizehandler="tl" class="resizebig-handle resizebig-handle-0"></div>\
        <div id="resizebig-' + mySel.id + '-1" resizehandler="top" class="resizebig-handle resizebig-handle-1"></div>\
        <div id="resizebig-' + mySel.id + '-2" resizehandler="tr" class="resizebig-handle resizebig-handle-2"></div>\
        <div id="resizebig-' + mySel.id + '-3" resizehandler="left" class="resizebig-handle resizebig-handle-3"></div>\
        <div id="resizebig-' + mySel.id + '-4" resizehandler="right" class="resizebig-handle resizebig-handle-4"></div>\
        <div id="resizebig-' + mySel.id + '-5" resizehandler="bl" class="resizebig-handle resizebig-handle-5"></div>\
        <div id="resizebig-' + mySel.id + '-6" resizehandler="bottom" class="resizebig-handle resizebig-handle-6"></div>\
        <div id="resizebig-' + mySel.id + '-7" resizehandler="br" class="resizebig-handle resizebig-handle-7"></div>';
        appendHtml(elm_resize_handlers, html_resize_handler_big);
      }
      var html_resize_handlers = '<div id="resize-' + mySel.id + '-0" resizehandler="tl" class="resize-handle resize-handle-0"></div>\
        <div id="resize-' + mySel.id + '-1" resizehandler="top" class="resize-handle resize-handle-1"></div>\
        <div id="resize-' + mySel.id + '-2" resizehandler="tr" class="resize-handle resize-handle-2"></div>\
        <div id="resize-' + mySel.id + '-3" resizehandler="left" class="resize-handle resize-handle-3"></div>\
        <div id="resize-' + mySel.id + '-4" resizehandler="right" class="resize-handle resize-handle-4"></div>\
        <div id="resize-' + mySel.id + '-5" resizehandler="bl" class="resize-handle resize-handle-5"></div>\
        <div id="resize-' + mySel.id + '-6" resizehandler="bottom" class="resize-handle resize-handle-6"></div>\
        <div id="resize-' + mySel.id + '-7" resizehandler="br" class="resize-handle resize-handle-7"></div>';
      appendHtml(elm_resize_handlers, html_resize_handlers);

      var elm_rotate_handlers = document.querySelector('#' + mySel.selDomId + ' .rotate-handler');
      var html_rotate_handlers = '<div id="rotateconnecterline-' + mySel.id + '-0" class="rotate-connecterline"></div>\
        <div id="rotatebig-' + mySel.id + '-0" class="rotatebig-handle"></div>\
        <div id="rotate-' + mySel.id + '-0" class="rotate-handle"></div>';
      appendHtml(elm_rotate_handlers, html_rotate_handlers);
      mySel.updateGripCursors();
    }

  };
  build.clearSelection = function () {
    mySel = null;
    var shape_elms = document.getElementsByClassName('selshape');
    for (var i = 0; i < shape_elms.length; ++i) {
      var shape = shape_elms[i];
      shape.classList.remove('selshape_active');
      var elm_resize_handlers = document.querySelector('#' + shape.getAttribute('id') + ' .resize-handlers');
      if (elm_resize_handlers)
        elm_resize_handlers.innerHTML = "";
      var elm_rotate_handlers = document.querySelector('#' + shape.getAttribute('id') + ' .rotate-handler');
      if (elm_rotate_handlers)
        elm_rotate_handlers.innerHTML = "";
    }
    build.restoreSelectionOrder();
  };
  build.restoreSelectionOrder = function () {
    dom_dragMain.sortDom(".selshape", function (a, b) {
      if (parseInt(a.getAttribute('zidx')) > parseInt(b.getAttribute('zidx'))) {
        return 1;
      } else {
        return -1;
      }
    });
  };
  build.rotate = function (deg) {
    if (mySel !== null) {
      mySel.rotate(deg);
    }
  };
  build.bringToFront = function (){
    if (mySel !== null) {
      s.bringToFront();
    }
  };
  build.sendToBack = function (){
    if (mySel !== null) {
      s.sendToBack();
    }
  };
  build.add = function (type, jsonObj) {
    debug.log('Add a ' + type + ' element');
    switch (type) {
      case 'image':
        var shape = new Shape(shapeId, 'image', 20 /*60 + getRondom(160)*/, 20 /*60 + getRondom(150)*/, 100, 100, 'rgba(100, 100, 100, .5)', shapeId);
        shape.add(shape);
        build.setDefaultData(shapeId);
        shapeId++;
    }

    return build;
  };
  build.addimage = function (x, y, data) {
    var shape = new Shape(shapeId, 'image', x, y, 100, 100, 'transparent', shapeId);
    shape.add(shape);
    shape.setData(data);
    shapeId++;
  }
  build.setDefaultData = function (shapeId) {
    var shape = objectFindByKey(shapes, 'id', shapeId);
    if (shape == null) {
      debug.log('setDefaultData error!')
      return;
    }
    if (shape.type == 'image' || shape.type == 'android_image' || shape.type == 'botkeyboard' || shape.type == 'botvote') {
      shape.data = 'img/canvasimage.png';
    }
    shape.datacount = 0;
    shape.draw();
  };
  for (var i$ in handle) {
    fn$(i$);
  }
  return build;

  function fn$(it) {
    build[it] = function (v) {
      if (arguments.length === 0) {
        return handle[it];
      } else {
        handle[it] = v;
        return build;
      }
    };
  }

  //for global function
  function getRadian(degree) {
    return degree * Math.PI / 180;
  }
  function getDegree(radians) {
    return radians * 180 / Math.PI;
  }

  /* For resizeing while a shape with non-zero angle */
  function calcChangePercent(pixel, length) {
    if (pixel === 0) {
      return 1;
    }
    return 1 + (pixel / length);
  }
  function calcRotate(degree, point, center) {
    var obj = { x: point.x, y: point.y };
    var angle = degree;
    var x, y;
    if (center == null) {
      center = { x: 0, y: 0 };
    }
    if (point.x === center.x && point.y === center.y) {
      return point;
    }
    angle *= Math.PI / 180;
    obj.x -= center.x;
    obj.y -= center.y;
    x = (obj.x * (Math.cos(angle))) - (obj.y * Math.sin(angle));
    y = (obj.x * (Math.sin(angle))) + (obj.y * Math.cos(angle));
    obj.x = x + center.x;
    obj.y = y + center.y;
    return obj;
  };
  function calcScale(x_ratio, y_ratio, point, origin) {
    var obj = { x: point.x, y: point.y };
    if (origin == null) {
      origin = { x: 0, y: 0 };
    }
    obj.x += (point.x - origin.x) * (x_ratio - 1);
    obj.y += (point.y - origin.y) * (y_ratio - 1);
    return obj;
  };
  function calcMidPoint(a, b) {
    var p = 0.5;
    return { x: (a.x + (b.x - a.x) * p), y: (a.y + (b.y - a.y) * p) };
  }
  function calcRealScale(x_ratio, y_ratio, point, degree, old_center, origin) {
    var obj = { x: point.x, y: point.y };
    if (degree !== 0) {
      obj = calcRotate(360 - degree, obj, old_center);
    }
    obj = calcScale(x_ratio, y_ratio, obj, calcRotate(360 - degree, origin, old_center))
    if (degree !== 0) {
      obj = calcRotate(degree, obj, old_center);
    }
    return obj
  }
  function doScale(x_ratio, y_ratio, degree, tl, br, width, height, old_center, origin) {
    var obj = { x: old_center.x, y: old_center.y, width: width, height: height, tl: null, br: null };

    var point = { x: tl.x, y: tl.y };
    var newtl = calcRealScale(x_ratio, y_ratio, point, degree, old_center, origin);

    point = { x: br.x, y: br.y };
    var newbr = calcRealScale(x_ratio, y_ratio, point, degree, old_center, origin);

    obj.tl = newtl;
    obj.br = newbr;
    obj.width *= x_ratio;
    obj.height *= y_ratio;
    obj.x = calcMidPoint(newtl, newbr).x;
    obj.y = calcMidPoint(newtl, newbr).y;
    if (obj.width === 0) {
      obj.width = 1;
    }
    if (obj.height === 0) {
      obj.height = 1;
    }
    return obj;
  };

  /* For checking overlapping */
  function calcRotateCenter(w, h, degree) {
    var center = {};

    center.x = ((w * Math.cos(getDegree(degree))) - ((h * Math.sin(getDegree(degree))))) / 2;
    center.y = ((h * Math.cos(getDegree(degree))) + ((w * Math.sin(getDegree(degree))))) / 2;
    //console.log("calcRotateCenter x="+center.x+";y="+center.y+";deg="+degree);
    return center;
  }

  function findCoordAfterRotate(x, y, w, h, oriX, oriY, originDegree, targetDegree) {
    var pos = [];
    if (originDegree == 0 && targetDegree == 0) {
        pos[0] = x;
        pos[1] = y;
        return pos;
    }
    var center = calcRotateCenter(w, h, originDegree);
    var Ax = parseFloat(x),
        Ay = parseFloat(y),
        Bx = parseFloat(oriX) + parseFloat(center.x),
        By = parseFloat(oriY) + parseFloat(center.y);
    pos[0] = parseFloat(Bx) + parseFloat(((Ax - Bx) * Math.cos(getDegree(targetDegree - originDegree))) - (((Ay - By) * Math.sin(getDegree(targetDegree - originDegree)))));
    pos[1] = parseFloat(By) + parseFloat(((Ay - By) * Math.cos(getDegree(targetDegree - originDegree))) + (((Ax - Bx) * Math.sin(getDegree(targetDegree - originDegree)))));
    //console.log("calcPositionAtDeg0 x="+posAt0.x+";y="+posAt0.y+";origin="+origin+";target="+target);
    return pos;
  }

  function findCoordAfterRotateXX(x, y, w, h, oriX, oriY, originDegree, targetDegree) {
    var pos = [];
    var point = {x:x,y:y,w:w,h:h}; 
    var center = {x:x+w/2,y:y+h/2};
    var obj = calcRotate(targetDegree,point,center);
    pos[0] = obj.x;
    pos[1] = obj.y;
    return pos;
  };

  function findPointInPolygon(point, vs) {
      var xi, xj, yi, yj, intersect,
          x = point[0],
          y = point[1],
          inside = false;
      for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
          xi = vs[i][0];
          yi = vs[i][1];
          xj = vs[j][0];
          yj = vs[j][1];
          intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
      }
      return inside;
  }

  function getCorners(x, y, w, h, degree) {
      var arr = [];
      //var oriAt0 = {};
      //oriAt0 = findCoordAfterRotate(x, y, w, h, x, y, degree, 0);
      //x = oriAt0[0];
      //y = oriAt0[1];
      arr.push(findCoordAfterRotate(x, y, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w, y, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w, y + h, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x, y + h, w, h, x, y, 0, degree));

      return arr;
  }

  function getSamplePoints(x, y, w, h, degree) {
      var arr = [];
      //var oriAt0 = {};
      //oriAt0 = findCoordAfterRotate(x, y, w, h, x, y, degree, 0);
      //x = oriAt0[0];
      //y = oriAt0[1];
      arr.push(findCoordAfterRotate(x, y, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w, y, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w, y + h, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x, y + h, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w / 2, y, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w, y + h / 2, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w / 2, y + h, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x, y + h / 2, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w * 0.5, y + h * 0.25, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w * 0.75, y + h * 0.5, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w * 0.5, y + h * 0.75, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w * 0.25, y + h * 0.5, w, h, x, y, 0, degree));
      arr.push(findCoordAfterRotate(x + w / 2, y + h / 2, w, h, x, y, 0, degree));
      return arr;
  }

  function checkOverlap(elmForCheck, elmsToCheck, callback, checkgap, elmsToExclude) {
      var result = false;
      var overlap = false;
      var Aret = false;
      var Bret = false;
      var a = getCorners(elmForCheck.x, elmForCheck.y, elmForCheck.w, elmForCheck.h, elmForCheck.r);
      var aR = getSamplePoints(elmForCheck.x, elmForCheck.y, elmForCheck.w, elmForCheck.h, elmForCheck.r);
      for (var i in elmsToCheck) {
          overlap = false;
          var s = elmsToCheck[i];
          var doCheck = true;
          if (elmsToExclude !== undefined && elmsToExclude !== null && elmsToExclude.length > 0 && elmsToExclude.indexOf(s.id) !== -1) {
              doCheck = false;
          } else {
              doCheck = true;
          }
          if (s.id === elmForCheck.id) {
              doCheck = false;
          }
          if (doCheck === true) {
              var Acoords = getCorners(s.x + checkgap, s.y + checkgap, s.w - 2 * checkgap, s.h - 2 * checkgap, s.r);
              var AcoordsR = getSamplePoints(s.x + checkgap, s.y + checkgap, s.w - 2 * checkgap, s.h - 2 * checkgap, s.r);
              var Bcoords = getCorners(s.x - checkgap, s.y - checkgap, s.w + 2 * checkgap, s.h + 2 * checkgap, s.r);
              var BcoordsR = getSamplePoints(s.x - checkgap, s.y - checkgap, s.w + 2 * checkgap, s.h + 2 * checkgap, s.r);
              //check a's round 16 points overlap with s's corner area
              Aret = false;
              Bret = false;
              for (var j in aR) {
                  if (findPointInPolygon(aR[j], Acoords)) {
                      Aret = true;
                  }
              }
              for (var k in aR) {
                  if (findPointInPolygon(aR[k], Bcoords)) {
                      Bret = true;
                  }
              }
              if (Aret === true && Bret === true) {
                  overlap = true;
                  //console.log('overlapA!');
              }
              //check c's round 16 points overlap with a's corner area
              Aret = false;
              Bret = false;
              for (var m in AcoordsR) {
                  if (findPointInPolygon(AcoordsR[m], a)) {
                      Aret = true;
                  }
              }
              for (var n in BcoordsR) {
                  if (findPointInPolygon(BcoordsR[n], a)) {
                      Bret = true;
                  }
              }
              if (Aret === true && Bret === true) {
                  overlap = true;
                  //console.log('overlapB!');
              }
              result = result || overlap;
              if (callback !== null) {
                  callback(s.id, overlap);
              }
          }
      }
      return result;
  }
  function checkOverlapFast(elmForCheck, elmsToCheck, callback, checkgap, elmsToExclude) {
      var result = false;
      var overlap = false;
      var Aret = false;
      var Bret = false;
      var a = getCorners(elmForCheck.x, elmForCheck.y, elmForCheck.w, elmForCheck.h, elmForCheck.r);
      var aR = getSamplePoints(elmForCheck.x, elmForCheck.y, elmForCheck.w, elmForCheck.h, elmForCheck.r);
      for (var i in elmsToCheck) {
          overlap = false;
          var s = elmsToCheck[i];
          var doCheck = true;
          if (elmsToExclude !== undefined && elmsToExclude !== null && elmsToExclude.length > 0 && elmsToExclude.indexOf(s.id) !== -1) {
              doCheck = false;
          } else {
              doCheck = true;
          }
          if (s.id === elmForCheck.id) {
              doCheck = false;
          }
          if (doCheck === true) {

              var Acoords = getCorners(s.x + checkgap, s.y + checkgap, s.w - 2 * checkgap, s.h - 2 * checkgap, s.r);
              var AcoordsR = getSamplePoints(s.x + checkgap, s.y + checkgap, s.w - 2 * checkgap, s.h - 2 * checkgap, s.r);
              //var Bcoords = getCorners(s.x - checkgap, s.y- checkgap , s.w + 2 * checkgap, s.h + 2 * checkgap, s.r);
              //var BcoordsR = getSamplePoints(s.x - checkgap, s.y - checkgap, s.w + 2 * checkgap, s.h + 2 * checkgap, s.r);
              //check a's round 16 points overlap with s's corner area
              Aret = false;
              Bret = false;
              for (var j in aR) {
                  if (findPointInPolygon(aR[j], Acoords)) {
                      Aret = true;
                  }
              }
              /*
              for (var k in aR) {
                  if (findPointInPolygon(aR[k], Bcoords)) {
                      Bret = true;
                  }
              }*/
              if (Aret === true) {
                  overlap = true;
              }
              //check c's round 16 points overlap with a's corner area
              Aret = false;
              Bret = false;
              for (var m in AcoordsR) {
                  if (findPointInPolygon(AcoordsR[m], a)) {
                      Aret = true;
                  }
              }
              /*
              for (var n in BcoordsR) {
                  if (findPointInPolygon(BcoordsR[n], a)) {
                      Bret = true;
                  }
              }
              */
              if (Aret === true) {
                  overlap = true;
              }
              result = result || overlap;
              if (callback !== null) {
                  callback(s.id, overlap);
              }

          }
      }
      return result;
  }
};

function createEditor() {
  editor = layouteditor('editwrapper');
  editor.call(editor);
  editor.addimage(30, 30, 'Koala.jpg');
  editor.addimage(150, 30, 'Tulips.jpg');
  editor.addimage(30, 150, 'Penguins.jpg');
}

window.addEventListener('load', function () {
  var preventPullToRefreshCheckbox = true;
  var preventOverscrollGlowCheckbox = true;
  var preventScrollCheckbox = true;

  var maybePreventPullToRefresh = false;
  var lastTouchY = 0;
  var touchstartHandler = function (e) {
    if (e.touches.length != 1) return;
    lastTouchY = e.touches[0].clientY;
    // Pull-to-refresh will only trigger if the scroll begins when the
    // document's Y offset is zero.
    maybePreventPullToRefresh = (preventPullToRefreshCheckbox && window.pageYOffset == 0);
  }

  var touchmoveHandler = function (e) {
    var touchY = e.touches[0].clientY;
    var touchYDelta = touchY - lastTouchY;
    lastTouchY = touchY;

    if (maybePreventPullToRefresh) {
      // To suppress pull-to-refresh it is sufficient to preventDefault the
      // first overscrolling touchmove.
      maybePreventPullToRefresh = false;
      if (touchYDelta > 0) {
        e.preventDefault();
        return;
      }
    }

    if (preventScrollCheckbox) {
      e.preventDefault();
      return;
    }

    if (preventOverscrollGlowCheckbox) {
      if (window.pageYOffset == 0 && touchYDelta > 0) {
        e.preventDefault();
        return;
      }
    }
  }

  document.addEventListener('touchstart', touchstartHandler, {
    passive: false
  });
  document.addEventListener('touchmove', touchmoveHandler, {
    passive: false
  });
});
//ref
//https://hacks.mozilla.org/2014/11/interact-js-for-drag-and-drop-resizing-and-multi-touch-gestures/
//http://jdanyow.github.io/aurelia-solitaire/
//https://github.com/jbaysolutions/vue-grid-layout
//https://www.bountysource.com/teams/interact.js/issues
//https://github.com/taye/interact.js/issues/217
/*
document.getElementById("MyElement").classList.add('MyClass');

document.getElementById("MyElement").classList.remove('MyClass');

if ( document.getElementById("MyElement").classList.contains('MyClass') )

document.getElementById("MyElement").classList.toggle('MyClass');

*/
/*
for old browser
if (!document.getElementsByClassName) {
    document.getElementsByClassName=function(cn) {
        var allT=document.getElementsByTagName('*'), allCN=[], i=0, a;
        while(a=allT[i++]) {
            a.className==cn ? allCN[allCN.length]=a : null;
        }
        return allCN
    }
}
*/