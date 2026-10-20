const locks = new WeakMap();

// Overlapping loading screens and dialogs must release only their own lock.
export function acquireInert(element, { initiallyInert = element.inert } = {}) {
    let lock = locks.get(element);
    if (!lock) {
        lock = { previous: initiallyInert, owners: new Set() };
        locks.set(element, lock);
    }
    const owner = {};
    lock.owners.add(owner);
    element.inert = true;
    return () => {
        if (!lock.owners.delete(owner) || lock.owners.size) return;
        element.inert = lock.previous;
        locks.delete(element);
    };
}
