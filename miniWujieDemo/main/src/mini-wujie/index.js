import MiniWujie from './MiniWujie.vue'
import { bus } from './bus.js'
import { defineMiniWujieElement } from './element.js'

defineMiniWujieElement()

export { bus, MiniWujie }
