/**
 * 参考文献引用 - 渲染
 */
function render_reference_ref(tokens: any, idx: any, options: any, env: any, slf: any) {
    const index = tokens[idx].meta.index;
    return `<sup><a href="#${index}">[${index}]</a></sup>`
}

/**
 * 参考文献引用
 *
 * [^n]
 */
function reference_ref(state: any, silent: any) {
    return reference_def_or_ref(state, silent, false)
}

/**
 * 参考文献定义-渲染
 */
function render_reference_def(tokens: any, idx: any, options: any, env: any, slf: any) {
    const index = tokens[idx].meta.index;
    return `<a id="${index}">[${index}]</a>`
}

/**
 * 参考文献定义
 *
 * [n]
 */
function reference_def(state: any, silent: any) {
    return reference_def_or_ref(state, silent, true)
}

function reference_def_or_ref(state: any, silent: any, def: boolean) {
    const ref = !def

    const start = state.pos
    const max = state.posMax
    const src = state.src

    // 定义必须是行首
    if (def && start > 0 && src.charCodeAt(start - 1) !== 0x0A) {
        return false
    }
    // 最小需要 4 个字符 [n]
    if (start + 3 > max) {
        return false
    }
    // [
    if (src.charCodeAt(start) !== 0x5B) {
        return false
    }
    // ^
    if (ref && src.charCodeAt(start + 1) !== 0x5E) {
        return false
    }

    let indexOffset
    if (def) {
        indexOffset = 1
    } else {
        indexOffset = 2
    }
    let pos
    for (pos = start + indexOffset; pos < max; pos++) {
        const c = src.charCodeAt(pos)
        // ]
        if (c === 0x5D) {
            break
        }
        // 空格
        if (c === 0x20) {
            return false
        }
        // 换行
        if (c === 0x0A) {
            return false
        }
        // 非数字
        if (c < 0x30 || c > 0x39) {
            return false
        }
    }

    // 没有序号
    if (pos === start + indexOffset) {
        return false
    }
    // 没有找到
    if (pos >= max) {
        return false
    }

    const index = src.slice(start + indexOffset, pos)

    // 不知道 silent 有什么用，是不需要添加 token 吗
    if (!silent) {
        let tokenName
        if (def) {
            tokenName = "reference_def"
        } else {
            tokenName = "reference_ref"
        }
        const token = state.push(tokenName, "", 0)
        token.meta = {index: index}
    }

    // 应该是赋值供后续处理
    state.pos = pos + 1
    state.posMax = max
    return true
}

export function markdown_it_reference(md: any) {
    // 参考文献引用
    md.renderer.rules.reference_ref = render_reference_ref
    md.inline.ruler.after("image", "reference_ref", reference_ref)

    // 参考文献定义
    md.renderer.rules.reference_def = render_reference_def
    md.inline.ruler.after("reference_ref", "reference_def", reference_def)
}