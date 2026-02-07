export default {
    // 不使用 auth，所有数据公开可读写
    feeds: {
        allow: {
            view: 'true',
            create: 'true',
            update: 'true',
            delete: 'true',
        },
    },
    folders: {
        allow: {
            view: 'true',
            create: 'true',
            update: 'true',
            delete: 'true',
        },
    },
    feedItems: {
        allow: {
            view: 'true',
            create: 'true',
            update: 'true',
            delete: 'true',
        },
    },
}
