
const notifications = await Service.import("notifications")
const { Gtk, Gdk } = imports.gi;

/** @param {import('resource:///com/github/Aylur/ags/service/notifications.js').Notification} n */
function NotificationIcon({ app_entry, app_icon, image }) {
    if (image) {
        return Widget.Box({
            css: `background-image: url("${image}");`
                + "background-size: contain;"
                + "background-repeat: no-repeat;"
                + "background-position: center;",
        })
    }

    let icon = "dialog-information-symbolic"
    if (Utils.lookUpIcon(app_icon))
        icon = app_icon

    if (app_entry && Utils.lookUpIcon(app_entry))
        icon = app_entry

    return Widget.Box({
        child: Widget.Icon(icon),
    })
}


/** @param {import('resource:///com/github/Aylur/ags/service/notifications.js').Notification} n */
function Notification(n) {
    const icon = Widget.Box({
        vpack: "start",
        class_name: "notification_sidebar_icon",
        child: NotificationIcon(n),
    })

    const title = Widget.Label({
        class_name: "notification_sidebar_title",
        xalign: 0,
        justification: "left",
        hexpand: true,
        max_width_chars: 24,
        truncate: "end",
        wrap: true,
        label: n.summary,
        use_markup: true,
    })

    const body = Widget.Label({
        class_name: "notification_sidebar_body",
        hexpand: true,
        use_markup: true,
        xalign: 0,
        justification: "left",
        label: n.body,
        wrap: true,
        truncate: "end",
    })

    const actions = Widget.Box({
        halign: Gtk.Align.END,
        class_name: "notification_sidebar_actions",
        children: n.actions.map(({ id, label }) => Widget.Button({
            class_name: "notification_sidebar_button",
            on_clicked: () => {
                n.invoke(id)
            },
            hexpand: false,
            child: Widget.Label(label),
        })),
    })

    let Box = Widget.EventBox(
        {
            attribute: { id: n.id },
            on_primary_click: () => n.close(),
        },
        Widget.Box(
            {
                class_name: `notification_sidebar ${n.urgency}`,
                vertical: true,
            },
            Widget.Box([
                icon,
                Widget.Box(
                    { vertical: true },
                    title,
                    body,
                ),
            ]),
            actions,
        ),
    )
    return Box
}

export function NotificationsBox({ exclude = [], include = [] }) {
    let isEmpty = Variable(false)
    const list = Widget.Box({
        vertical: true,
        children: notifications.popups.map(Notification)
    })

    const _list = Widget.Box({
        vertical: true,
        children: [
            list,
            Widget.Label({
                label: "Empty",
                visible: isEmpty.bind(),
                class_name: "empty"
            })
        ],
        class_name: "notifications_list_sidebar"
    })

    function setIsEmpty() {
        if (list.children.length > 0) isEmpty.setValue(false)
        else isEmpty.setValue(true)
    }

    function onNotified(_, /** @type {number} */ id) {
        const n = notifications.getNotification(id)
        if (n) {
            if (exclude.includes(n.app_name.trim()))
                return
            if (include.length == 0 || include.includes(n.app_name.trim())) {
                const notificationWidget = Notification(n)
                list.children = [notificationWidget, ...list.children]
                setIsEmpty()
            }
        }
    }

    function onClosed(_, /** @type {number} */ id) {
        list.children.find(n => n.attribute.id === id)?.destroy()
        setIsEmpty()
    }
    list.hook(notifications, onNotified, "notified")
        .hook(notifications, onClosed, "closed")

    const menu = Widget.Menu({
        class_name: "notifications_menu",
        children: [
            Widget.MenuItem({
                child: Widget.Label('Close all'),
                class_name: "notifications_menu_item",
                on_activate: () => {
                    for (let x of list.children) {
                        const n = notifications.getNotification(x.attribute.id)
                        if (n) {
                            n.dismiss()
                            n.close()
                        }
                    }
                }
            }),
        ],
    })

    return Widget.EventBox({
        vexpand: true,
        hexpand: true,
        on_secondary_click: (_, event) => {
            menu.popup_at_pointer(event)
        },
        child: Widget.Scrollable({
            class_name: "notifications_sidebar_scrollable",
            hscroll: "never",
            child: _list,
            hexpand: true

            /** this is a simple one liner that could be used instead of
                hooking into the 'notified' and 'dismissed' signals.
                but its not very optimized becuase it will recreate
                the whole list everytime a notification is added or dismissed */
            // children: notifications.bind('popups')
            //     .as(popups => popups.map(Notification))
        }),
    })
}
