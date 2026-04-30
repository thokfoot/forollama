import Fuse from 'fuse.js'
import careersData from '../data/careers.json'

// flatten nodes
function flattenNodes(node, acc = []) {
    acc.push({ id: node.id, label: node.label || '', raw: node })
    if (node.children) node.children.forEach(child => flattenNodes(child, acc))
    return acc
}

const list = flattenNodes(careersData)
const fuse = new Fuse(list, {
    keys: ['label', 'id'],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2
})

export function searchCareers(query) {
    if (!query || query.trim().length < 2) return []
    const res = fuse.search(query)
    return res.map(r => r.item.id)
}
