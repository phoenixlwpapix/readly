import { i } from '@instantdb/react'

const _schema = i.schema({
    entities: {
        feeds: i.entity({
            title: i.string(),
            url: i.string().unique().indexed(),
            link: i.string(),
            description: i.string(),
            imageUrl: i.string().optional(),
            lastFetched: i.string().optional(),
            isFavorite: i.boolean().optional(),
            createdAt: i.number().indexed(),
        }),
        folders: i.entity({
            name: i.string().indexed(),
            isExpanded: i.boolean(),
            sortBy: i.string().optional(),
            order: i.number().indexed(),
            createdAt: i.number().indexed(),
        }),
        feedItems: i.entity({
            title: i.string(),
            link: i.string().indexed(),
            content: i.string(),
            contentSnippet: i.string(),
            author: i.string(),
            pubDate: i.string().indexed(),
            imageUrl: i.string().optional(),
            isRead: i.boolean().indexed(),
            isStarred: i.boolean().indexed(),
            summary: i.string().optional(),
            createdAt: i.number().indexed(),
        }),
    },
    links: {
        feedFolder: {
            forward: { on: 'feeds', has: 'one', label: 'folder' },
            reverse: { on: 'folders', has: 'many', label: 'feeds' },
        },
        feedItems: {
            forward: { on: 'feedItems', has: 'one', label: 'feed', onDelete: 'cascade' },
            reverse: { on: 'feeds', has: 'many', label: 'items' },
        },
    },
})

type _AppSchema = typeof _schema
interface AppSchema extends _AppSchema { }
const schema: AppSchema = _schema

export type { AppSchema }
export default schema
