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

/**
 * @branch 3.0.x
 */

const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const BoxPointer = imports.ui.boxpointer;
const Clutter = imports.gi.Clutter;
const Gtk = imports.gi.Gtk;

let lastOpened = null;


/**
 * Implements an "almost" classic menu.
 */
function PopupSubMenuClassic() {
    this._init.apply(this, arguments);
}

PopupSubMenuClassic.prototype = {
    __proto__: PopupMenu.PopupMenu.prototype,
/*
    _init: function(sourceActor, alignment, arrowSide, gap) {
        PopupMenu.PopupMenu.prototype._init.call (this, sourceActor, 'popup-menu-content');

        this._alignment = alignment;
        this._arrowSide = arrowSide;
        this._gap = gap;

        this._boxPointer = new BoxPointer.BoxPointer(arrowSide,
                                                     { x_fill: true,
                                                       y_fill: true,
                                                       x_align: St.Align.START });
        this.actor = this._boxPointer.actor;
        this.actor._delegate = this;
        this.actor.style_class = 'popup-menu-boxpointer';
        this.actor.connect('key-press-event', Lang.bind(this, this._onKeyPressEvent));

        this._boxWrapper = new Shell.GenericContainer();
        this._boxWrapper.connect('get-preferred-width', Lang.bind(this, this._boxGetPreferredWidth));
        this._boxWrapper.connect('get-preferred-height', Lang.bind(this, this._boxGetPreferredHeight));
        this._boxWrapper.connect('allocate', Lang.bind(this, this._boxAllocate));
        this._boxPointer.bin.set_child(this._boxWrapper);
        this._boxWrapper.add_actor(this.box);
        this.actor.add_style_class_name('popup-menu');

        global.focus_manager.add_group(this.actor);
        this.actor.reactive = true;
    },

    _boxGetPreferredWidth: function (actor, forHeight, alloc) {
        let columnWidths = this.getColumnWidths();
        this.setColumnWidths(columnWidths);

        // Now they will request the right sizes
        [alloc.min_size, alloc.natural_size] = this.box.get_preferred_width(forHeight);
    },

    _boxGetPreferredHeight: function (actor, forWidth, alloc) {
        [alloc.min_size, alloc.natural_size] = this.box.get_preferred_height(forWidth);
    },

    _boxAllocate: function (actor, box, flags) {
        this.box.allocate(box, flags);
    },
*/
    _onKeyPressEvent: function(actor, event) {
        if (event.get_key_symbol() == Clutter.Escape) {
            this.close(true);
            return true;
        }

        return false;
    },
/*
    setArrowOrigin: function(origin) {
        this._boxPointer.setArrowOrigin(origin);
    },
*/
    open: function(animate, eventType) {
        
        if (eventType == Clutter.EventType.KEY_PRESS) {
            
            this._keyOpen(animate);
            return;
            
        } else if (eventType == Clutter.EventType.BUTTON_RELEASE) {
            
            this._btnOpen(animate);
            return;
            
        } else {
            
            //global.log(eventType);
            //global.log(Clutter.EventType.KEY_PRESS);
        }
    },

    toggle: function(eventType) {
        
        if (this.isOpen)
            this.close(true);
        else
            this.open(true, eventType);
    },
    
    _keyOpen: function(animate) {
        
        if (this.isOpen)
            return;

        if (lastOpened && lastOpened.isOpen)
            lastOpened.close(true);
        
        lastOpened = this;
        this.isOpen = true;

        this._boxPointer.setPosition(this.sourceActor, this._gap, this._alignment);
        this._boxPointer.show(animate);

        this.emit('open-state-changed', true);
    },
    
    _btnOpen: function(animate) {
        
        if (this.isOpen)
            return;
        
        if (lastOpened && lastOpened.isOpen)
            lastOpened.close(true);
        
        lastOpened = this;
        this.isOpen = true;
        
        this._boxPointer.setPosition(this.sourceActor, this._gap, this._alignment);
        
        let [x, y, mask] = global.get_pointer();
        this._boxPointer._xPosition = x + 10;
        
        this.actor.set_anchor_point(-(this._boxPointer._xPosition + this._boxPointer._xOffset),
                -(this._boxPointer._yPosition + this._boxPointer._yOffset));

        this._boxPointer.show(animate);

        this.emit('open-state-changed', true);
    },

    close: function(animate) {
        if (!this.isOpen)
            return;

        if (this._activeMenuItem)
            this._activeMenuItem.setActive(false);

        this._boxPointer.hide(animate);

        this.isOpen = false;
        lastOpened = null;
        
        this.emit('open-state-changed', false);
    }
};


/**
 * Make the PopupSubMenuMenuItem use the new PopupSubMenuClassic.
 */
PopupMenu.PopupSubMenuMenuItem.prototype._init = function(text) {
    PopupMenu.PopupBaseMenuItem.prototype._init.call(this);

    this.actor.add_style_class_name('popup-submenu-menu-item');

    this.label = new St.Label({ text: text });
    this.addActor(this.label);
    this._triangle = new St.Label({ text: '\u25B8' });
    this.addActor(this._triangle, { align: St.Align.END });
    
    this.menu = new PopupSubMenuClassic(this.actor, 0.5, St.Side.LEFT, 0);
    //this.menu = new PopupMenu.PopupMenu(this.actor, 0.5, St.Side.LEFT, 0);
    //this.menu.connect('open-state-changed', Lang.bind(this, this._subMenuOpenStateChanged));
    
    Main.chrome.addActor(this.menu.actor, { visibleInOverview: true,
                                            affectsStruts: false });
    this.menu.actor.hide();
};

PopupMenu.PopupSubMenuMenuItem.prototype._onButtonReleaseEvent = function (actor, event) {
    this.menu.toggle(event.type());
};

PopupMenu.PopupSubMenuMenuItem.prototype._onKeyPressEvent = function(actor, event) {
    let symbol = event.get_key_symbol();

    if (symbol == Clutter.KEY_Right && !this.menu.isOpen) {

        this.menu.open(true, event.type());
        //this.menu.actor.navigate_focus(null, Gtk.DirectionType.DOWN, false);        
        return true;
        
    } else if (symbol == Clutter.KEY_Left && this.menu.isOpen) {
        
        this.menu.close();
        return true;
        
    } else if (symbol == Clutter.KEY_space || symbol == Clutter.KEY_Return) {
        
        this.menu.toggle(event.type());
        return true;
    }
    
    return false;
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

function main(extensionMeta) {
 
    Main.panel._menus._menus.forEach(function(menu) {
        updateMenuItems(menu.menu);
    });

    // Wait until all the indicators are loaded, so we can change all the menus.
    /*Main.panel.startStatusArea = Lang.bind(Main.panel, function() {
    
        this.__proto__.startStatusArea.call(this);

        this._menus._menus.forEach(function(menu) {
            updateMenuItems(menu.menu);
        });
    });*/
}

function init(meta) {
    main(meta);
}

function enable() {
}

function disable() {
}
