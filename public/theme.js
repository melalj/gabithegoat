function startLoading() {
  document.getElementById('progress').removeAttribute('class');
}

function stopLoading() {
  document.getElementById('progress').setAttribute('class', 'stop');
}

function postData(url, data) {
  return fetch(url, {
    body: JSON.stringify(data),
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json'
    },
    method: 'POST',
    mode: 'cors',
    redirect: 'follow',
  })
  .then(response => response.json())
}

function getData(url) {
  return fetch(url, {
    credentials: 'same-origin',
    method: 'GET',
  })
  .then(response => response.text());
}

function onReady() {
  // MATCH HEADER AND HEADER REPLACER HEIGHT
  var headerElement = document.querySelector('header');
  var headerReplacerElement = document.querySelector('.header-replacer');
  if (headerElement && headerReplacerElement) {
    headerReplacerElement.style.height = headerElement.getBoundingClientRect().height + "px";
  }  

  // STICKY HEADER
  var stickyHeaderEnabled = false;
  var stickyHeaderTimeout;

  function stickyHeaderOnScroll() {
    var stickyHeaderTrigger = document.querySelector('[data-sticky-trigger]');
    if (!stickyHeaderTrigger) return;
    var rect = stickyHeaderTrigger.getBoundingClientRect();
    var stickyAttr = stickyHeaderTrigger.getAttribute('data-sticky-trigger');
    var stickyHeaderTriggerValue = stickyAttr === 'bottom' ? rect.bottom : rect.top;
    if (!stickyHeaderEnabled && stickyHeaderTriggerValue < 0) {
      document.querySelector('body').setAttribute('class', 'fixed-header');
      stickyHeaderEnabled = true;
    } else if (stickyHeaderEnabled && window.scrollY <= 100) {
      clearTimeout(stickyHeaderTimeout);
      document.querySelector('body').removeAttribute('class');
      stickyHeaderEnabled = false;
    } else if (stickyHeaderEnabled && stickyHeaderTriggerValue > 0) {
      document.querySelector('body').setAttribute('class', 'fixed-header fixed-header-end');
      stickyHeaderTimeout = window.setTimeout(function() {
        document.querySelector('body').removeAttribute('class');
        stickyHeaderEnabled = false;
        stickyHeaderTimeout = null;
      }, 300);
    }
  }
  document.addEventListener('scroll', stickyHeaderOnScroll);

  // MENU MOBILE
  var menuMobile = document.getElementById('navbar');
  function menuMobileOnClick() {
    if (menuMobile.getAttribute('class') === 'navbar-collapse collapse') {
      menuMobile.setAttribute('class', 'navbar-collapse')
      document.querySelector('.nav-toggle').setAttribute('class', 'nav-toggle icon-cross');
    } else {
      menuMobile.setAttribute('class', 'navbar-collapse collapse');
      document.querySelector('.nav-toggle').setAttribute('class', 'nav-toggle icon-menu');
    }
  }

  document.querySelector('.nav-toggle').addEventListener('click', menuMobileOnClick);

  // GA EVENT TRACKING
  var tagWithEventTracking = document.querySelectorAll('[data-event-click]');
  for (var i = 0; i < tagWithEventTracking.length; i++) {
    tagWithEventTracking[i].addEventListener('click', function () {
      var tagEventSplit = this.getAttribute('data-event-click').split(',');
      var eventData = {};
      if (tagEventSplit[1]) eventData.event_category = tagEventSplit[1];
      if (tagEventSplit[2]) eventData.event_label = tagEventSplit[2];
      if(gtag) gtag('event', tagEventSplit[0], eventData);
    });
  }

  // AUDIO
  var audioScream = document.getElementById('scream');

  // GOAT HEAD
  var goatHead = document.querySelector('.illo-container');
  var goatHeadDirections = document.querySelectorAll('[data-hover]');

  var goatHeadHadLoggedEvent = false;
  var goatHeadHadOver = false;

  var goatHeadLastPosition;

  var goatHeadTimeoutMouth;
  var goatHeadTimeoutRelease;

  if (goatHead) {
    function goatHeadOnSqueeze() {
      audioScream.currentTime = 0;
      audioScream.play();
      if (navigator.vibrate) navigator.vibrate(300);
      clearTimeout(goatHeadTimeoutMouth);
      goatHeadTimeoutMouth = window.setTimeout(function() {
        goatHead.setAttribute('data-pos', 'illo-open');
        goatHeadTimeoutRelease = window.setTimeout(goatHeadOnRelease, 1000);
        if (!goatHeadHadLoggedEvent) {
          if(gtag) gtag('event', 'goatHead-squeeze');
          goatHeadHadLoggedEvent = true;
        }
      }, 50);
    }
    
    function goatHeadOnRelease() {
      clearTimeout(goatHeadTimeoutMouth);
      clearTimeout(goatHeadTimeoutRelease);
      goatHead.setAttribute('data-pos', goatHeadLastPosition);
      audioScream.pause();
    }

    function goatMoveHead(cl) {
      goatHead.setAttribute('data-pos', cl);
      goatHeadLastPosition = cl;
      if (!goatHeadHadOver) {
        if(gtag) gtag('event', 'goatHead-over', { 'event_category': cl });
        goatHeadHadOver = true;
      }
    }
    
    function goatHeadOnOver() {
      goatMoveHead(this.getAttribute('class'));
    }
    
    function goatHeadOnOut() {
      goatHead.removeAttribute('data-pos');
      goatHeadLastPosition = null;
    }

    var iOrientation = null;
    var triggerOrient = 15;
    function goatDeviceOrientation(e) {
      if (e.beta && e.gamma && e.alpha) {
        cOrientation = [e.beta, e.gamma, e.alpha];
        if (!iOrientation) {
          iOrientation = [e.beta, e.gamma, e.alpha];
        }

        var dX = iOrientation[0] - cOrientation[0];
        var dY = iOrientation[1] - cOrientation[1];
        var newPosition = null;
        if (dX > triggerOrient) {
          newPosition = 'illo-top';
        } else if (dX <= -1 * triggerOrient) {
          newPosition = 'illo-bottom';
        } else if (dY > triggerOrient) {
          newPosition = 'illo-left';
        } else if (dY <= -1 * triggerOrient) {
          newPosition = 'illo-right';
        } else {
          newPosition = null;
        }

        if (goatHeadLastPosition !== newPosition) {
          if (!newPosition) {
            goatHeadOnOut();
          } else {
            goatMoveHead(newPosition);
          }
        }
      }
    }

    if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', goatDeviceOrientation);
    }
    
    for (var i = 0; i < goatHeadDirections.length; i++) {
      goatHeadDirections[i].addEventListener('mouseover', goatHeadOnOver);
      goatHeadDirections[i].addEventListener('mouseout', goatHeadOnOut);
    }
    
    goatHead.addEventListener('mousedown', goatHeadOnSqueeze);
    goatHead.addEventListener('touchstart', goatHeadOnSqueeze);
    goatHead.addEventListener('mouseup', goatHeadOnRelease);
    goatHead.addEventListener('touchend', goatHeadOnRelease);  
  
    // MOVE GOAT HEAD
    window.setTimeout(function() {
      goatHead.setAttribute('data-pos', 'illo-left');
        window.setTimeout(function() {
          goatHead.removeAttribute('data-pos');
        }, 500);
    }, 3000);
  }

  // FULL GOAT
  var fullGoat = document.querySelector('#goat-action');
  var fullGoatBackground = document.querySelector('.fulltoy-section .goat');
  var fullGoatHadLoggedEvent = false;

  var fullGoatFirstSqueeze = 0;

  var fullGoatTimeoutSqueeze;
  var fullGoatTimeoutRelease;
  var fullGoatTimeoutReset;

  if (fullGoat) {
    function fullGoatOnSqueeze() {
      clearTimeout(fullGoatTimeoutSqueeze);
      clearTimeout(fullGoatTimeoutRelease);
    
      var dateDiffTriggerScream = Date.now() - fullGoatFirstSqueeze 
      var deltaTriggerScream = (dateDiffTriggerScream > 300) ? 300 : 0;
      if (fullGoatFirstSqueeze) fullGoatFirstSqueeze = Date.now();  
    
      fullGoat.parentNode.setAttribute('class', 'fulltoy-section noselect squeezed');
      fullGoatTimeoutSqueeze = window.setTimeout(function() {
        fullGoatBackground.setAttribute('class', 'goat squeezed');
        audioScream.currentTime = 0;
        audioScream.play();
        if (navigator.vibrate) navigator.vibrate(300);
        fullGoatFirstSqueeze = Date.now();  
    
        fullGoatTimeoutRelease = window.setTimeout(fullGoatOnRelease, 1000);
        if (!fullGoatHadLoggedEvent) {
          document.querySelector('.fulltoy-section .bubble').innerHTML = document.querySelector('.fulltoy-section .bubble').getAttribute('data-callback');
          if(gtag) gtag('event', 'fullGoat-squeeze');
          fullGoatHadLoggedEvent = true;
        }
      }, deltaTriggerScream);
    }
    
    function fullGoatOnRelease() {
      clearTimeout(fullGoatTimeoutSqueeze);
      clearTimeout(fullGoatTimeoutReset);
      clearTimeout(fullGoatTimeoutRelease);  
      fullGoatTimeoutReset = window.setTimeout(function() {
        fullGoatFirstSqueeze = null;
      }, 600);
      if (!fullGoatHadLoggedEvent) {
        document.querySelector('.fulltoy-section .bubble').innerHTML = document.querySelector('.fulltoy-section .bubble').getAttribute('data-keep');
      }
      fullGoatBackground.setAttribute('class', 'goat');
      fullGoat.parentNode.setAttribute('class', 'fulltoy-section noselect');
      audioScream.pause();
    }
    
    fullGoat.addEventListener('mousedown', fullGoatOnSqueeze);
    fullGoat.addEventListener('touchstart', fullGoatOnSqueeze);
    fullGoat.addEventListener('mouseup', fullGoatOnRelease);
    fullGoat.addEventListener('touchend', fullGoatOnRelease);  
  }

  // ATTACH LINK TO COLLAGE SHADOW
  if (document.querySelector('.collage-shadow')){
    document.querySelector('.collage-shadow').addEventListener('click', function() {
      this.querySelector('a').click();
    });
  }

  // ATTACH LINK TO ITEM
  if (document.querySelectorAll('.item').length){
    var items = document.querySelectorAll('.item');
    for (var i = 0; i < items.length; i += 1) {
      items[i].addEventListener('click', function() {
        this.querySelector('a').click();
      });
    } 
  }

  // CURSOR SCROLL
  if (document.querySelector('.hero-scroll')) {
    document.querySelector('.hero-scroll').addEventListener('click', function() {
      var scrollY = document.querySelector('.story').getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, scrollY);
    });
  }

  // CURSOR ZOOM
  if (document.querySelectorAll('[data-zoom-scale]').length) {
    var zoomItems = document.querySelectorAll('[data-zoom-scale]');
    for (var i = 0; i < zoomItems.length; i++) {
      if (!zoomItems[i].querySelector('img')) continue;
      zoomItems[i].addEventListener('mouseover', function() {
        if (window.innerWidth < 500) return;
        this.querySelector('img').style.transform = 'scale('+ this.getAttribute('data-zoom-scale') + ')';
      });
      zoomItems[i].addEventListener('mouseout', function() {
        this.querySelector('img').style.transform = 'scale(1)';
      });
      zoomItems[i].addEventListener('mousemove', function(e) {
        if (window.innerWidth < 500) return;
        var r = this.getBoundingClientRect();
        var x = ((e.pageX - r.x) / r.width) * 100;
        var y = ((e.pageY - r.y) / r.height) * 100;
        this.querySelector('img').style.transformOrigin = x + '% ' + y + '%';
      });
    }
  }

  //////////////////////
  /// CART

  var timeoutUpdateCart;
  var updateDataCart = {};

  // ADD TO CART
  function addToCartAnim() {
    var addToCartImg = document.querySelector('[data-product-featured-image]');
    if (!addToCartImg) return;

    var imgCloneContainer = document.createElement('div');
    imgCloneContainer.setAttribute('class', 'product-img-cart');
    imgCloneContainer.appendChild(addToCartImg.cloneNode(true));

    // source
    var rSource = addToCartImg.getBoundingClientRect();
    imgCloneContainer.style.width = rSource.width + 'px';
    imgCloneContainer.style.height = rSource.height + 'px';
    imgCloneContainer.style.top = rSource.y + 'px';
    imgCloneContainer.style.left = rSource.x + 'px';

    document.querySelector('body').appendChild(imgCloneContainer);

    // destination
    window.setTimeout(function(){
      var rDest = document.querySelector('[data-cart-icon]').getBoundingClientRect();
      var tX = (rDest.x - rSource.x - rSource.width * (1 - (rDest.width / rSource.width)) / 2);
      var tY = (rDest.y - rSource.y - rSource.height * (1 - (rDest.height / rSource.height)) / 2);
      imgCloneContainer.style.transform = 'translateX(' + tX + 'px)translateY(' + tY + 'px)scale(0)';
    }, 50);

  }

  function addCartSubmit(e){
    e.preventDefault();
    document.location.href = "/checkout";
  }

  if (document.getElementById('add-to-cart-form')) {
    var addToCartForm = document.getElementById('add-to-cart-form');
    addToCartForm.addEventListener('submit', addCartSubmit);

    var headerAddCart = document.querySelector('.cta-cart');
    if (addToCartForm && headerAddCart) {
      headerAddCart.addEventListener('click', function(e) {
        addCartSubmit(e);
      });
    }
  }

  // SHOW/HIDE CART
  function showCart(cb) {
    startLoading();
    var cartContainer = document.querySelector('#cart');
    if (!cartContainer) return;  
    document.querySelector('body').classList.add('no-overflow');
    getData('/cart')
      .then(function(res) {
        cartContainer.innerHTML = res;
        window.setTimeout(function () {
          cartContainer.setAttribute('class', 'cart-container');
          attachCartEvents();
          stopLoading();
        }, 0);
      });
  }

  function hideCart() {
    var cartContainer = document.querySelector('#cart');
    if (!cartContainer) return;
    document.querySelector('body').classList.remove('no-overflow');    
    cartContainer.setAttribute('class', 'cart-container hidden');
  }

  function attachCartEvents() {
    // Hide cart events
    document.addEventListener('keydown', function (e) {
      if (e.keyCode == 27) {
        hideCart();
      }
    });
    var hideCartItems = document.querySelectorAll('[data-hide-cart]');
    for (var i = 0; i < hideCartItems.length; i++) {
      hideCartItems[i].addEventListener('click', hideCart);
    }

    // Items events
    attachIncrementItems();
    attachDecrementItems();
    attachRemoveItem();
    attachDonation();

  }

  var showCartItems = document.querySelectorAll('[data-show-cart]');
  for (var i = 0; i < showCartItems.length; i++) {
    showCartItems[i].addEventListener('click', showCart);
  }

  // INCREMENT
  function attachIncrementItems() {
    var incrementItems = document.querySelectorAll('[data-increment]:not([data-attached])');
    for (var i = 0; i < incrementItems.length; i++) {
      var targetIncrement = incrementItems[i].parentNode.querySelector('input');
      if (!targetIncrement) continue;
      incrementItems[i].addEventListener('click', function() {
        var itemId = this.getAttribute('data-increment');
        targetIncrement = this.parentNode.querySelector('input');
        targetIncrement.value = (Number(targetIncrement.value || 0) + 1) + '';
        updateDataCart[itemId] = Number(targetIncrement.value);
        updateCart();        
        if (targetIncrement.value > '1') {
          this.parentNode.querySelector('[data-decrement]').removeAttribute('disabled');
        }
      });
      incrementItems[i].setAttribute('data-attached', null);
    }
  }
  attachIncrementItems();

  // DECREMENT
  function attachDecrementItems() {
    var decrementItems = document.querySelectorAll('[data-decrement]:not([data-attached])');
    for (var i = 0; i < decrementItems.length; i++) {
      var targetDecrement = decrementItems[i].parentNode.querySelector('input');
      if (targetDecrement.value == '1') {
        decrementItems[i].setAttribute('disabled', null);
      }
      if (!targetDecrement) continue;
      decrementItems[i].addEventListener('click', function() {
        var itemId = this.getAttribute('data-decrement');
        targetDecrement = this.parentNode.querySelector('input');
        if (targetDecrement.value == '1') return;
        targetDecrement.value = (Number(targetDecrement.value || 0) - 1) + '';
        updateDataCart[itemId] = Number(targetDecrement.value);
        updateCart();        
        
        if (targetDecrement.value == '1') {
          this.setAttribute('disabled', null);
        }
      });
      decrementItems[i].setAttribute('data-attached', null);
    }
  }
  attachDecrementItems();

  // REMOVE ITEM CART
  function attachRemoveItem() {
    var removeItems = document.querySelectorAll('[data-remove-item]:not([data-attached])');
    for (var i = 0; i < removeItems.length; i++) {
      removeItems[i].addEventListener('click', function() {
        var itemId = this.getAttribute('data-remove-item');
        var itemLine = document.getElementById('cart-item-'+itemId);
        if (!itemLine) return;
        itemLine.parentNode.removeChild(itemLine);
        updateDataCart[itemId] = 0;
        updateCart();        
      });
      removeItems[i].setAttribute('data-attached', null);
    }
  }

  // DONATION
  function attachDonation() {
    var extraSelect = document.querySelector('#extra-options:not([data-attached])');
    console.log(extraSelect);
    if (!extraSelect) return;
    extraSelect.addEventListener('change', function() {
      var currentId = this.getAttribute('data-active-donation');
      var newId = this.value;
      console.log(currentId, newId);
      if (currentId === 'no' && newId !== 'no') {
        updateDataCart[newId] = 1;
      } else if (currentId !== 'no' && newId === 'no') {
        updateDataCart[currentId] = 0;
      } else if (currentId !== 'no' && newId !== 'no') {
        updateDataCart[currentId] = 0;
        updateDataCart[newId] = 1;
      }
      updateCart();        
    });
    extraSelect.setAttribute('data-attached', null);
  }
  attachDonation();

  // UPDATE CART
  function updateCart() {
    startLoading();
    clearTimeout(timeoutUpdateCart);
    timeoutUpdateCart = window.setTimeout(function () {
      var preloadItems = document.querySelectorAll('[data-preload]');
      for (var i = 0; i < preloadItems.length; i++) {
        preloadItems[i].innerHTML = "...";
      }
      postData('/cart/update.js', { updates: updateDataCart })
        .then(function(res) {
          updateDataCart = {};
          if (document.querySelector('[data-cart-count]')) {
            document.querySelector('[data-cart-count]').innerHTML = res.item_count;
          }
          showCart(); 
        });
    }, 300);
  }

  // Attach product image preview
  var activeProductImage;
  function openInstagram() {
    if (activeProductImage && activeProductImage.getAttribute('alt').indexOf('Instagram') !== -1) {
      window.open('https://instagram.com/gabithegoatofficial');
    }
  }

  function attachProductImageClick() {
    var imgContainer = document.querySelector('.product-image-list');
    if (imgContainer) {
      var imgList = imgContainer.querySelectorAll('img');
      document.querySelector('#product-img').addEventListener('click', openInstagram);
      for (var i = 0; i < imgList.length; i += 1) {
        imgList[i].addEventListener('click', function() {
          for (var j = 0; j < imgList.length; j += 1) {
            imgList[j].removeAttribute('class');
          }
          this.setAttribute('class', 'active');
          startLoading();
          activeProductImage = this;
          document.querySelector('#product-img').src = this.getAttribute('data-img');
          document.querySelector('#product-img').onload = function() {
            stopLoading();
          }
        });
      } 
    }
  }
  attachProductImageClick();

  // Scroll spy

  function scrollSpyAction() {
    var target = document.querySelector('[data-scrollspy-target]');
    var menu = document.querySelector('[data-scrollspy-menu]');
    var menuItems = document.querySelectorAll('[data-scrollspy-menu-item]');
    if (!menu || !target) return;
    if (target.offsetTop - 5 < window.scrollY) {
      menu.style.position = 'fixed';
    } else {
      menu.style.position = 'relative';
    }
    var lastMenuItem = null;
    for (var i = 0; i < menuItems.length; i += 1) {
      var menuTargetSel = menuItems[i].getAttribute('href');
      var menuTarget = document.querySelector(menuTargetSel);
      if (!menuTarget) continue;
      menuItems[i].removeAttribute('class');
      if (menuTarget.offsetTop - 5 < window.scrollY) {
        lastMenuItem = menuItems[i];
      }
    }
    if (lastMenuItem) {
      lastMenuItem.setAttribute('class', 'active');
    } else if (document.querySelector('[data-scrollspy-menu-default]')) {
      document.querySelector('[data-scrollspy-menu-default]').setAttribute('class', 'active');
    }
  }

  function attachScrollSpy() {
    if (!document.querySelector('[data-scrollspy-target]')) return;
    document.addEventListener('scroll', scrollSpyAction);
  }
  attachScrollSpy();

  // attach cart overlay click
  function clickOverlayLink() {
    var parent = this.parentNode.parentNode;
    var btn = parent.querySelector('.btn');
    if (!btn) return;
    btn.click();
  }

  function attachCardOverlay() {
    var cardOverlays = document.querySelectorAll('.card-overlay');
    for (var i = 0; i < cardOverlays.length; i++) {
      cardOverlays[i].addEventListener('click', clickOverlayLink);
    }
  }
  attachCardOverlay();

  stopLoading();
}

document.addEventListener('DOMContentLoaded', onReady, false);
