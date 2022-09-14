/*
 * Copyright 2022 pingfangx <https://www.pingfangx.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// 用于 markdown-preview-enhanced 插件的解析扩展

/**
 * 解析参考文献定义
 */
function parse_reference_def(markdown) {
    return markdown.replace(/^\[(\d+)](\s+.*)$/gm, (_, id, p2) => {
        // 拼接为 a 标签
        return `<a id="${id}">[${id}]</a>${p2}`
    })
}

/**
 * 解析参考文献引用
 */
function parse_reference_ref(markdown) {
    return markdown.replace(/(\[\^(\d+)])(?!:)/gm, (match, footnode, id) => {
        if (markdown.indexOf(footnode + ":") !== -1) {
            // 已经存在脚注定义，视为脚注引用，不处理
            return match
        }
        return `<sup><a href="#${id}">[${id}]</a></sup>`
    })
}

module.exports = {
    onWillParseMarkdown: function (markdown) {
        return new Promise((resolve, reject) => {
            markdown = parse_reference_def(markdown)
            markdown = parse_reference_ref(markdown)
            return resolve(markdown)
        })
    },
    onDidParseMarkdown: function (html, {cheerio}) {
        return new Promise((resolve, reject) => {
            return resolve(html)
        })
    },
    onWillTransformMarkdown: function (markdown) {
        return new Promise((resolve, reject) => {
            return resolve(markdown)
        })
    },
    onDidTransformMarkdown: function (markdown) {
        return new Promise((resolve, reject) => {
            return resolve(markdown)
        })
    }
}