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
 * Author: Antonio Hernández <ahernandez@emergya.com>
 *
 */

const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const BoxPointer = imports.ui.boxpointer;
const Clutter = imports.gi.Clutter;
const Gtk = imports.gi.Gtk;

// This is the maximun submenu height relative to the
// primary monitor height.
const MAX_SUBMENU_HEIGHT = 3/4;

let lastOpenedMenu = null;


function PopupClassicSubMenu() {
    this._init.apply(this, arguments);
}

PopupClassicSubMenu.prototype = {
    __proto__: PopupMenu.PopupMenu.prototype,

    _init: function(sourceActor, arrowAlignment, arrowSide) {

        PopupMenu.PopupMenu.prototype._init.call(this, sourceActor, arrowAlignment, arrowSide);

        // Since a function of a submenu might be to provide a "More.." expander
        // with long content, we make it scrollable - the scrollbar will only take
        // effect if a CSS max-height is set on the top menu.
        this._scrollview = new St.ScrollView({ style_class: 'popup-sub-menu',
                                         hscrollbar_policy: Gtk.PolicyType.NEVER,
                                         vscrollbar_policy: Gtk.PolicyType.NEVER });

        // StScrollbar plays dirty tricks with events, calling
        // clutter_set_motion_events_enabled (FALSE) during the scroll; this
        // confuses our event tracking, so we just turn it off during the
        // scroll.
        let vscroll = this._scrollview.get_vscroll_bar();
        vscroll.connect('scroll-start',
                        Lang.bind(this, function() {
                                      let topMenu = this._getTopMenu();
                                      if (topMenu)
                                          topMenu.passEvents = true;
                                  }));
        vscroll.connect('scroll-stop',
                        Lang.bind(this, function() {
                                      let topMenu = this._getTopMenu();
                                      if (topMenu)
                                          topMenu.passEvents = false;
                                  }));

        this.box.reparent(this._scrollview);
        this._boxPointer.bin.set_child(this._scrollview);

        this._scrollview.clip_to_allocation = true;
        this._scrollview.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    }
};

PopupClassicSubMenu.prototype._getTopMenu = PopupMenu.PopupSubMenu.prototype._getTopMenu;

PopupClassicSubMenu.prototype._onKeyPressEvent = function(actor, event) {

    let symbol = event.get_key_symbol();

    if (symbol == Clutter.Escape || symbol == Clutter.KEY_Left) {

        this.close(true);
        return true;
    }

    return false;
};

PopupClassicSubMenu.prototype.toggle = function(eventType) {
    if (this.isOpen) {
        this.close(true);
    } else {
        this.open(true, eventType);
    }
};

PopupClassicSubMenu.prototype.open = function(animate, eventType) {
    if (this.isOpen)
        return;

    if (lastOpenedMenu !== null) {
        lastOpenedMenu.close(true);
    }

    this.isOpen = true;
    lastOpenedMenu = this;

    let x = 0, y = 0;
    this._boxPointer.setPosition(this.sourceActor, this._arrowAlignment);

    // We position the menu close to the mouse coordinates if it opens by a click,
    // otherwise it'll be positioned at the main menu border.
    if (eventType == Clutter.EventType.BUTTON_RELEASE) {

        let [sourceW, sourceH] = this.sourceActor.get_size();
        let [sourceX, sourceY] = this.sourceActor.get_transformed_position();
        let [xPosition, yPosition, mask] = global.get_pointer();
        let baseX = sourceX + sourceW;
        // Ten pixels of separation between the mouse pointer and the boxPointer
        x = -(baseX - xPosition) + 10;
    }

    this._boxPointer.actor.set_position(x, y);
    this._boxPointer.show(animate);

    let [w, h] = this._boxPointer.actor.get_size();
    let allowedHeight = Main.layoutManager.primaryMonitor.height * MAX_SUBMENU_HEIGHT;
    if (h > allowedHeight) {
        this._boxPointer.actor.set_size(w, allowedHeight);
    }

    this.actor.raise_top();

    this.emit('open-state-changed', true);
};

PopupClassicSubMenu.prototype.close = function(animate) {

    if (!this.isOpen)
        return;

    if (this._activeMenuItem)
        this._activeMenuItem.setActive(false);

    this._boxPointer.hide(animate);

    this.isOpen = false;

    // Important: Return the focus to the parent menu before emit the
    // open-state-changed event, so it'll not be closed by the PopupMenuManager.
    this.sourceActor.navigate_focus(null, Gtk.DirectionType.DOWN, false);
    lastOpenedMenu = null;

    this.emit('open-state-changed', false);
}



let PopupSubMenuMenuItem_init = PopupMenu.PopupSubMenuMenuItem.prototype._init;
let PopupSubMenuMenuItem_onButtonReleaseEvent = PopupMenu.PopupSubMenuMenuItem.prototype._onButtonReleaseEvent
let PopupSubMenuMenuItem_onKeyPressEvent = PopupMenu.PopupSubMenuMenuItem.prototype._onKeyPressEvent

let Classic_PopupSubMenuMenuItem_init = function(text) {

    PopupSubMenuMenuItem_init.call(this, text);

    this.menu.destroy();
    this.menu = new PopupClassicSubMenu(this.actor, 0.5, St.Side.LEFT);
    this.menu.actor.hide();
    this.menu.connect('open-state-changed', Lang.bind(this, this._subMenuOpenStateChanged));
};

let Classic_PopupSubMenuMenuItem_onButtonReleaseEvent = function(actor, event) {
    this.menu.toggle(event.type());
};

let Classic_PopupSubMenuMenuItem_onKeyPressEvent = function(actor, event) {

    let symbol = event.get_key_symbol();

    if (symbol == Clutter.KEY_Right && !this.menu.isOpen) {

        this.menu.open(true, event.type());
        this.menu.actor.navigate_focus(null, Gtk.DirectionType.DOWN, false);
        return true;

    } else if (symbol == Clutter.KEY_Left && this.menu.isOpen) {

        this.menu.close();
        return true;

    } else if (symbol == Clutter.KEY_space || symbol == Clutter.KEY_Return || symbol == Clutter.KP_Enter) {

        this.menu.toggle(event.type());
        if (this.menu.isOpen) {
            this.menu.actor.navigate_focus(null, Gtk.DirectionType.DOWN, false);
        }
        return true;
    }

    return false;
};



let PopupBaseMenuItem_onKeyFocusIn = PopupMenu.PopupBaseMenuItem.prototype._onKeyFocusIn;
let PopupBaseMenuItem_onHoverChanged = PopupMenu.PopupBaseMenuItem.prototype._onHoverChanged;

let Classic_PopupBaseMenuItem_onKeyFocusIn = function(actor) {

    if (this.menu && lastOpenedMenu != null && this.menu !== lastOpenedMenu) {
        this.menu.open(true, Clutter.EventType.KEY_PRESS);
    }

    this.setActive(true);
};

let Classic_PopupBaseMenuItem_onHoverChanged = function(actor) {

    let activeChanged = actor.hover != this.active;

    if (this.menu && activeChanged && actor.hover && lastOpenedMenu != null && this.menu !== lastOpenedMenu) {
        this.menu.open(true, Clutter.EventType.BUTTON_RELEASE);
    }

    this.setActive(actor.hover);
};


/**
* Update the menus created before the load of this extension.
*/
function updateSubMenuItems(menu, menuItem) {

    let items = menu._getMenuItems();

    for (let i=0, l=items.length; i<l; i++) {

        let item = items[i];

        if (item instanceof PopupMenu.PopupSubMenuMenuItem) {

            let text = item.label.get_text();
            let new_item = new PopupMenu.PopupSubMenuMenuItem(text);
            menuItem.menu.addMenuItem(new_item);

            updateSubMenuItems(item.menu, new_item);

        } else {

            item.actor.reparent(menuItem.menu.box);
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
            item.actor.destroy();
            menu.addMenuItem(new_item, i);

            updateSubMenuItems(item.menu, new_item);
        }
    };

    return menu;
}

function main(meta) {
    Main.panel._menus._menus.forEach(function(menu) {
        updateMenuItems(menu.menu);
    });
}

function init(meta) {
    main(meta);
}

function enable() {
    PopupMenu.PopupSubMenuMenuItem.prototype._init = Classic_PopupSubMenuMenuItem_init;
    PopupMenu.PopupSubMenuMenuItem.prototype._onButtonReleaseEvent = Classic_PopupSubMenuMenuItem_onButtonReleaseEvent;
    PopupMenu.PopupSubMenuMenuItem.prototype._onKeyPressEvent = Classic_PopupSubMenuMenuItem_onKeyPressEvent;
    PopupMenu.PopupBaseMenuItem.prototype._onKeyFocusIn = Classic_PopupBaseMenuItem_onKeyFocusIn;
    PopupMenu.PopupBaseMenuItem.prototype._onHoverChanged = Classic_PopupBaseMenuItem_onHoverChanged;
    main(null);
}

function disable() {
    PopupMenu.PopupSubMenuMenuItem.prototype._init = PopupSubMenuMenuItem_init;
    PopupMenu.PopupSubMenuMenuItem.prototype._onButtonReleaseEvent = PopupSubMenuMenuItem_onButtonReleaseEvent;
    PopupMenu.PopupSubMenuMenuItem.prototype._onKeyPressEvent = PopupSubMenuMenuItem_onKeyPressEvent;
    PopupMenu.PopupBaseMenuItem.prototype._onKeyFocusIn = PopupBaseMenuItem_onKeyFocusIn;
    PopupMenu.PopupBaseMenuItem.prototype._onHoverChanged = PopupBaseMenuItem_onHoverChanged;
    main(null);
}
