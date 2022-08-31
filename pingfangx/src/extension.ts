import * as reference from './reference/reference'
import { ExtensionContext } from 'vscode'

export function activate(context: ExtensionContext) {
    reference.activate(context)
}