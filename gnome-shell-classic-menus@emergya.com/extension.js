/**
 * extension.js
 * Copyright (C) 2011, Junta de Andalucía <devmaster@guadalinex.org>
 * 
 * This file is part of Guadalinex
 * 
 * This software is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * As a special exception, if you link this library with other files to
 * produce an executable, this library does not by itself cause the
 * resulting executable to be covered by the GNU General Public License.
 * This exception does not however invalidate any other reasons why the
 * executable file might be covered by the GNU General Public License.
 * 
 * Authors:: Antonio Hernández (mailto:ahernandez@emergya.com)
 * 
 */

const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Gettext = imports.gettext;
const _ = Gettext.gettext;

const Lang = imports.lang;
const Shell = imports.gi.Shell;
const BoxPointer = imports.ui.boxpointer;
const Clutter = imports.gi.Clutter;
const Gtk = imports.gi.Gtk;

let lastOpened = null;

PopupMenu.PopupSubMenuMenuItem.prototype._init = function(text) {
    PopupMenu.PopupBaseMenuItem.prototype._init.call(this);

    this.actor.add_style_class_name('popup-submenu-menu-item');

    this.label = new St.Label({ text: text });
    this.addActor(this.label);
    this._triangle = new St.Label({ text: '\u25B8' });
    this.addActor(this._triangle, { align: St.Align.END });
    
    this.menu = new PopupMenu.PopupMenu(this.actor, 1.2, St.Side.LEFT, 0);
    //this.menu.connect('open-state-changed', Lang.bind(this, this._subMenuOpenStateChanged));
    
    Main.chrome.addActor(this.menu.actor, { visibleInOverview: true,
                                            affectsStruts: false });
    this.menu.actor.hide();
    
    this.menu._keyOpen = Lang.bind(this.menu, function(animate) {
        if (lastOpened && lastOpened.isOpen) {
            lastOpened.close(true);
        }
        lastOpened = this;
        try {
            this.__proto__.open.call(this, animate);
        } catch(e) {
            global.logError(e);
        }
    });
    
    this.menu._btnOpen = Lang.bind(this.menu, function(animate) {
        
        if (this.isOpen)
            return;
        
        if (lastOpened && lastOpened.isOpen) {
            lastOpened.close(true);
        }
        
        lastOpened = this;

        this.isOpen = true;

        this._boxPointer.setPosition(this.sourceActor, this._gap, this._alignment);
        
        let [x, y, mask] = global.get_pointer();
        this._boxPointer._xPosition = x + 10;
        
        this.actor.set_anchor_point(-(this._boxPointer._xPosition + this._boxPointer._xOffset),
                -(this._boxPointer._yPosition + this._boxPointer._yOffset));

        this._boxPointer.show(animate);

        this.emit('open-state-changed', true);
    });
    
    /*this.menu._needsScrollbar = Lang.bind(this.menu, function() {
        let items = this._getMenuItems();
        return items.length > 10;
    });*/
};

PopupMenu.PopupSubMenuMenuItem.prototype._onButtonReleaseEvent = function (actor, event) {
    this.menu.open = this.menu._btnOpen;
    this.menu.toggle();
};

PopupMenu.PopupSubMenuMenuItem.prototype._onKeyPressEvent = function(actor, event) {
    let symbol = event.get_key_symbol();

    if (symbol == Clutter.KEY_Right) {

        this.menu.open = this.menu._keyOpen;
        this.menu.open(true);
        
        //this.menu.actor.navigate_focus(null, Gtk.DirectionType.DOWN, false);
        
        return true;
    } else if (symbol == Clutter.KEY_Left && this.menu.isOpen) {
        this.menu.close();
        return true;
    }

    return PopupMenu.PopupBaseMenuItem.prototype._onKeyPressEvent.call(this, actor, event);
};




function PlacesButton() {
    this._init();
}
 
PlacesButton.prototype = {
    __proto__: PanelMenu.Button.prototype,
 
    _init: function() {
        PanelMenu.Button.prototype._init.call(this, 0.0);
 
        this._label = new St.Label({ text: _("MyPlaces") });
        this.actor.set_child(this._label);
        //Main.panel._centerBox.add(this.actor, { y_fill: true });
 
        let placeid;
        this.placeItems = [];
 
        this.defaultPlaces = Main.placesManager.getDefaultPlaces();
        this.bookmarks     = Main.placesManager.getBookmarks();
        this.mounts        = Main.placesManager.getMounts();
        

        let submenu = new PopupMenu.PopupSubMenuMenuItem("Submenu");
        this.menu.addMenuItem(submenu);
        
        let _items = [];
        _items[0] = new PopupMenu.PopupMenuItem("Submenu item 1");
        _items[1] = new PopupMenu.PopupMenuItem("Submenu item 2");
        _items[2] = new PopupMenu.PopupMenuItem("Submenu item 3");
        
        for (let i=0, l=_items.length; i<l; i++) {
            submenu.menu.addMenuItem(_items[i]);
        }
        
        
        
 
        // Display default places
        for ( placeid = 0; placeid < this.defaultPlaces.length; placeid++) {
            this.placeItems[placeid] = new PopupMenu.PopupMenuItem(_(this.defaultPlaces[placeid].name));
            this.placeItems[placeid].place = this.defaultPlaces[placeid];
            this.menu.addMenuItem(this.placeItems[placeid]);
            this.placeItems[placeid].connect('activate', function(actor,event) {
                actor.place.launch();
            });
 
        }
 
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        // Display default bookmarks
        for ( let bookmarkid = 0; bookmarkid < this.bookmarks.length; bookmarkid++, placeid++) {
            this.placeItems[placeid] = new PopupMenu.PopupMenuItem(_(this.bookmarks[bookmarkid].name));
            this.placeItems[placeid].place = this.bookmarks[bookmarkid];
            this.menu.addMenuItem(this.placeItems[placeid]);
            this.placeItems[placeid].connect('activate', function(actor,event) {
                actor.place.launch();
            });
        }
 
        if (this.mounts.length > 0) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }
 
        // Display default mounts
        for ( let mountid = 0; mountid < this.mounts.length; placeid++, mountid++ ) {
            this.placeItems[placeid] = new PopupMenu.PopupMenuItem(_(this.mounts[mountid].name));
            this.placeItems[placeid].place = this.mounts[mountid];
            this.menu.addMenuItem(this.placeItems[placeid]);
            this.placeItems[placeid].connect('activate', function(actor,event) {
                actor.place.launch();
            });
        }
        
        
        
        let submenu = new PopupMenu.PopupSubMenuMenuItem("Submenu");
        this.menu.addMenuItem(submenu);
        
        let _items = [];
        _items[0] = new PopupMenu.PopupMenuItem("Submenu item 1");
        _items[1] = new PopupMenu.PopupMenuItem(this.defaultPlaces[0].name);
        _items[1].place = this.defaultPlaces[0]
        _items[1].connect('activate', function(actor, event) {
            actor.place.launch();
        });
        _items[2] = new PopupMenu.PopupMenuItem("Submenu item 3");
        
        for (let i=0, l=_items.length; i<l; i++) {
            submenu.menu.addMenuItem(_items[i]);
        }
 
        Main.panel._leftBox.add(this.actor, { y_fill: true });
        Main.panel._menus.addMenu(this.menu);
 
    }
 
};


function updateSubMenuItems(menu, menuItem) {
 
    let items = menu._getMenuItems();
    
    for (let i=0, l=items.length; i<l; i++) {
        
        let new_item = null;
        let item = items[i];
        
        try {
        
        if (item instanceof PopupMenu.PopupSubMenuMenuItem) {

            let text = item.label.get_text();
            
            new_item = new PopupMenu.PopupSubMenuMenuItem(text);
            menuItem.addMenuItem(new_item);

            updateSubMenuItems(item.menu, new_item);
            
        } else {
            
            item.actor.reparent(menuItem.menu.box);
        }
        
        } catch (e) {
            global.log(e);
            for (let o in item)
                global.log(o);
        }
        
    }
}

function updateMenuItems(menu) {

    let items = menu._getMenuItems();
    
    for (let i=0, l=items.length; i<l; i++) {
        
        let item = items[i];
        
        if (item instanceof PopupMenu.PopupSubMenuMenuItem) {
            
            let text = item.label.get_text();
            let new_item = new PopupMenu.PopupSubMenuMenuItem(text);
            
            menu.box.remove_actor(item.actor);
            menu.addMenuItem(new_item, i);

            updateSubMenuItems(item.menu, new_item);
        }
    };
    
    return menu;
}
 
function main(extensionMeta) {
 
    new PlacesButton();

    Main.panel._menus._menus.forEach(function(menu) {
        updateMenuItems(menu.menu);
    });
}

function init(meta) {
    main(meta);
}

function enable() {
    
}

function disable() {
    
}
