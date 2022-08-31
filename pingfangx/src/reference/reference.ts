import { commands, ExtensionContext, Position, Range, TextDocument, TextEditorEdit, workspace } from 'vscode'
import { cursorMove, getCurrentEditor, getCurrentEditorLineNumber } from '../util/editor'

/** 参考文献行 */
const REFERENCE_LINE_PATTERN = /^\[(\d+)](\s*)(.*)$/
/** 引用参考文献 */
const REFER_REFERENCE_PATTERN = /\[\^(\d+)]/g

/** 插入 */
function insertReference() {
    // 当前活跃编辑器
    const editor = getCurrentEditor()
    if (!editor) {
        return
    }
    // 光标位置
    const cursorPosition: Position = editor.selection.active
    const lineNumber = cursorPosition.line
    // 以行号从文档中取行
    const line = editor.document.lineAt(lineNumber).text
    const lineEndPosition = new Position(lineNumber, line.length)
    let matches
    // 此处不用判断英文、中文，直接或，更具兼容性
    const referenceTitle = getReferenceTitle()
    const re = new RegExp(`^#+\\s+(参考文献|References|${referenceTitle})`, "i")
    if ((matches = re.exec(line)) !== null) {
        // 如果找到 heading
        return editor.edit(editBuilder => {
            editBuilder.insert(lineEndPosition, '\n[1] ')
            updateReferenceAfterInsert(cursorPosition, editBuilder)
        }).then(() => {
            cursorMove(1)
        })
    } else if ((matches = REFERENCE_LINE_PATTERN.exec(line)) !== null) {
        // Reference
        const index = matches[1]
        const space = matches[2]
        return editor.edit(editBuilder => {
            editBuilder.insert(lineEndPosition, `\n[${Number(index) + 1}]${space}`)
            updateReferenceAfterInsert(cursorPosition, editBuilder)
        }).then(() => {
            cursorMove(1)
        })
    } else {
        return editor.edit(editBuilder => {
            const referenceTitle = getReferenceTitle()
            editBuilder.insert(lineEndPosition, `\n## ${referenceTitle}\n[1] `)
        }).then(() => {
            cursorMove(2)
        })
    }
}

function getReferenceTitle() {
    // 配置的自定义标题
    let customReferenceTitle: string = workspace.getConfiguration("pingfangx.reference").get("customTitle") ?? ""
    if (customReferenceTitle != "") {
        return customReferenceTitle
    }
    // 配置的标题
    let referenceTitle: string = workspace.getConfiguration("pingfangx.reference").get("title") ?? ""
    if (referenceTitle == "default" || referenceTitle == "custom") {
        // 配置了 custom 但是为空，视为默认
        const config = JSON.parse(process.env.VSCODE_NLS_CONFIG ?? "")
        referenceTitle = config["locale"]
    }
    referenceTitle = referenceTitle.toLocaleLowerCase()
    if (referenceTitle.startsWith("en")) {
        return "References"
    } else if (referenceTitle.startsWith("zh")) {
        return "参考文献"
    } else {
        return `unsupported locale ${referenceTitle}`
    }
}

/** 删除 */
function deleteReference() {
    const editor = getCurrentEditor()
    if (!editor) {
        return
    }
    editor.edit(eidtorBuilder => {
        const cursorPos: Position = editor.selection.active
        const lineNumber = cursorPos.line
        const line = editor.document.lineAt(lineNumber)
        if (lineNumber > 0) {
            // 非首行，删至前一行行尾
            const preLine = editor.document.lineAt(lineNumber - 1)
            eidtorBuilder.delete(new Range(lineNumber - 1, preLine.text.length, lineNumber, line.text.length))
        } else {
            // 首行，删至后一行行首
            if (lineNumber < editor.document.lineCount - 1) {
                eidtorBuilder.delete(new Range(lineNumber, 0, lineNumber + 1, 0))
            } else {
                eidtorBuilder.delete(new Range(lineNumber, 0, lineNumber, line.text.length))
            }
        }
        decreaseReference(cursorPos.line + 1, eidtorBuilder)
    })
}

/** 插入后更新后续参考文献 */
function updateReferenceAfterInsert(position: Position, editorBuilder: TextEditorEdit) {
    // 使用同一个 builder，插入还未执行，因此从插入点下一行开始增加即可
    increaseReference(position.line + 1, editorBuilder)
}

/** 增 */
function increaseReference(fromLine: number, editorBuilder: TextEditorEdit) {
    updateReference(fromLine, 1, editorBuilder)
}

/** 减 */
function decreaseReference(fromLine: number, editorBuilder: TextEditorEdit) {
    updateReference(fromLine, -1, editorBuilder)
}

/**
 * 更新参考文献
 * @param fromLine 起始行，如果为空则调用 getCurrentEditorLineNumber()
 * @param offset 增加索引为 +1，减小索引为 -1
 * @param editorBuilder 如果为空则会 editor.edit，如果不为空，可以使操作合为一步，方便撤销
 */
function updateReference(fromLine: number | object, offset: number, editorBuilder?: TextEditorEdit) {
    if (fromLine === undefined || typeof (fromLine) !== "number") {
        // 方法调用未传参，或是从右键菜单调用第 1 个参数为当前文件名（是 object 不是 string）
        fromLine = getCurrentEditorLineNumber()
    }
    if (fromLine < 0) {
        return
    }
    const editor = getCurrentEditor()
    if (!editor) {
        return
    }
    if (editorBuilder === undefined) {
        editor.edit(editorBuilder => {
            updateReference(fromLine, offset, editorBuilder)
        })
        return
    }
    const document = editor.document
    const lineCount = document.lineCount
    let match
    const findIndexes = new Set<number>()
    for (let i = fromLine; i < lineCount; i++) {
        const line = document.lineAt(i).text
        if (!line) {
            break
        }
        // 文档中描述：字面量正则表达式不会重编译
        if ((match = REFERENCE_LINE_PATTERN.exec(line)) !== null) {
            const index = match[1]
            findIndexes.add(Number(index))
            editorBuilder.replace(new Range(i, 0, i, index.length + 2), `[${Number(index) + offset}]`)
        } else {
            // 不匹配则跳出循环
            break
        }
    }
    replaceReferReference(document, findIndexes, offset, editorBuilder)
}

/** 替换参考文献的引用 */
function replaceReferReference(document: TextDocument, findIndexes: Set<number>, offset: number, editorBuilder: TextEditorEdit) {
    if (findIndexes.size == 0) {
        return
    }
    const lineCount = document.lineCount
    // 也可以 < fromLine，差别不太大，但考虑逻辑还是整体查找
    for (let i = 0; i < lineCount; i++) {
        const line = document.lineAt(i).text
        if (!line) {
            continue
        }
        const matches = line.matchAll(REFER_REFERENCE_PATTERN)
        for (const match of matches) {
            const index = match[1]
            if (!findIndexes.has(Number(index))) {
                continue
            }
            const matchStart = match.index
            if (!matchStart) {
                continue
            }
            const matchLength = match[0].length
            editorBuilder.replace(new Range(i, matchStart, i, matchStart + matchLength), `[^${Number(index) + offset}]`)
        }
    }
}

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('pingfangx.reference.insert', insertReference),
        commands.registerCommand('pingfangx.reference.delete', deleteReference),
        commands.registerCommand('pingfangx.reference.increase', increaseReference),
        commands.registerCommand('pingfangx.reference.decrease', decreaseReference),
    )
}