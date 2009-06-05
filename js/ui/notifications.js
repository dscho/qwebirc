qwebirc.ui.HilightController = new Class({
  initialize: function(parent) {
    this.parent = parent;
    this.regex = null;
    this.prevnick = null;
  },
  match: function(text) {
    var nick = this.parent.nickname;
    if(nick != this.prevnick)
      this.regex = new RegExp('\\b' + RegExp.escape(nick) + '\\b', "i");
      
    if(text.match(this.regex))
      return true;
    return false;
  }
});

qwebirc.ui.Beeper = new Class({
  initialize: function(uiOptions) {
    this.uiOptions = uiOptions;
    
    this.soundInited = false;
    this.soundReady = false;

    if(this.uiOptions.BEEP_ON_MENTION)
      this.soundInit();
  },
  soundInit: function() {
    if(this.soundInited)
      return;
    if(!$defined(Browser.Plugins.Flash) || Browser.Plugins.Flash.version < 8)
      return;
    this.soundInited = true;
    
    this.soundPlayer = new qwebirc.sound.SoundPlayer();
    this.soundPlayer.addEvent("ready", function() {
      this.soundReady = true;
    }.bind(this));
    
    this.soundPlayer.go();
  },
  beep: function() {
    if(!this.soundReady || !this.uiOptions.BEEP_ON_MENTION)
      return;
      
    this.soundPlayer.beep();
  }
});

qwebirc.ui.Flasher = new Class({
  initialize: function(uiOptions) {
    this.uiOptions = uiOptions;
    
    this.windowFocused = false;
    this.canUpdateTitle = true;
    this.titleText = document.title;

    var favIcons = $$("link[rel=icon]"), favIconParent = $$("head");
    if(favIcons && favIcons.length > 0 && favIconParent && favIconParent.length > 0) {
      this.favIcon = favIcons[0];
      this.favIconParent = favIconParent[0];
      this.favIconVisible = true;
      this.emptyFavIcon = new Element("link");
      this.emptyFavIcon.rel = "shortcut icon";
      this.emptyFavIcon.href = "/images/empty_favicon.ico";
      
      this.flashing = false;
    
      window.addEvent("focus", function() { this.windowFocused = true; this.cancelFlash(); console.log("focus") }.bind(this));
      window.addEvent("blur", function() { this.windowFocused = false; console.log("blue") }.bind(this));
      
      this.canFlash = true;
    } else {
      this.canFlash = false;
    }    
  },
  flash: function() {
    if(!this.uiOptions.FLASH_ON_MENTION || this.windowFocused || !this.canFlash || this.flashing)
      return;

    this.titleText = document.title; /* just in case */      
    var flashA = function() {
      this.hideFavIcon();
      this.canUpdateTitle = false;
      document.title = "Activity!";
      
      this.flasher = flashB.delay(500);
    }.bind(this);
    
    var flashB = function() {
      this.showFavIcon();
      this.canUpdateTitle = true;
      document.title = this.titleText;
      
      this.flasher = flashA.delay(500);
    }.bind(this);

    this.flashing = true;
    flashA();
  },
  cancelFlash: function() {
    if(!this.canFlash || !$defined(this.flasher))
      return;
      
    this.flashing = false;
    
    $clear(this.flasher);
    this.flasher = null;
    
    this.showFavIcon();
    document.title = this.titleText;
    this.canUpdateTitle = true;
  },
  hideFavIcon: function() {
    if(this.favIconVisible) {
      this.favIconVisible = false;
      this.favIconParent.removeChild(this.favIcon);
      this.favIconParent.appendChild(this.emptyFavIcon);
    }
  },
  showFavIcon: function() {
    if(!this.favIconVisible) {
      this.favIconVisible = true;
      this.favIconParent.removeChild(this.emptyFavIcon);
      this.favIconParent.appendChild(this.favIcon);
    }
  },
  updateTitle: function(text) {
    this.titleText = text;
    return this.canUpdateTitle;
  }
});
