import { commands, TextEditor, window } from 'vscode'

/**
 *
 * @returns 当前活跃编辑器或 undefined
 */
function getCurrentEditor(): TextEditor | undefined {
    return window.activeTextEditor
}

/**
 *
 * @returns 当前编辑器活跃行，或 -1
 */
function getCurrentEditorLineNumber(): number {
    const editor: TextEditor | undefined = window.activeTextEditor
    if (!editor) {
        return -1
    }
    return editor.selection.active.line
}

/**
 * 移动光标
 *
 * 如果光标在行中，插入以后，光标位于原位，因此需要移动
 * 如果光标在行尾，插入以后，光标位于插入位置（此方法中获取即是插入行的行尾），就不需要再移动了
 *
 * @param lineOffset 移动的行数
 */
function cursorMove(lineOffset: number) {
    const editor = getCurrentEditor()
    if (!editor) {
        return
    }
    // 光标位置
    const cursorPosition = editor.selection.active
    const lineNumber = cursorPosition.line
    const line = editor.document.lineAt(lineNumber).text
    if (cursorPosition.character === line.length) {
        // 光标在行尾，无需移动
        return
    }
    // 光标下移指定行
    commands.executeCommand("cursorMove", {
        "to": "down",
        "by": "line",
        "value": lineOffset
    })
    // 光标移到行尾
    commands.executeCommand("cursorMove", {
        "to": "wrappedLineEnd",
        "by": "wrappedLine"
    })
}

export { getCurrentEditor, getCurrentEditorLineNumber, cursorMove }