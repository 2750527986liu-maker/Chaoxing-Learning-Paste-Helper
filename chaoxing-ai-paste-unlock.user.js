// ==UserScript==
// @name         超星学习通复制粘贴助手 - AI评测页面粘贴限制解除 (Chaoxing Copy Paste Helper)
// @namespace    https://github.com/2750527986liu-maker/Chaoxing-Learning-Paste-Helper
// @version      1.0
// @description  超星学习通复制粘贴助手。解除超星学习通AI评测页面、作业、考试的粘贴限制。支持Ctrl+V粘贴、Ctrl+Shift+V粘贴、悬浮按钮一键粘贴。针对 mooc2-ans.chaoxing.com AI评测答题页面，capture阶段拦截paste + 原生setter注入 + InputEvent模拟打字。
// @author       2750527986liu-maker
// @match        *://mooc2-ans.chaoxing.com/*
// @match        *://*.chaoxing.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chaoxing.com
// @downloadURL  https://raw.githubusercontent.com/2750527986liu-maker/Chaoxing-Learning-Paste-Helper/main/chaoxing-ai-paste-unlock.user.js
// @updateURL    https://raw.githubusercontent.com/2750527986liu-maker/Chaoxing-Learning-Paste-Helper/main/chaoxing-ai-paste-unlock.user.js
// @updateURL    https://github.com/2750527986liu-maker/Chaoxing-AI-Paste-Unlock/raw/main/chaoxing-ai-paste-unlock.user.js
// @run-at       document-end
// @grant        GM_log
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const LOG = (...args) => {
        const msg = '[CX Paste] ' + args.join(' ');
        console.log(msg);
        try { GM_log(msg); } catch(e) {}
    };

    LOG('🚀 终极粘贴解锁启动');

    const TARGET_CLASS = 'main-dialog-textarea';

    // =============================================
    // 核心：capture 阶段拦截 paste，阻止页面看到
    // =============================================
    function installPasteInterceptor() {
        document.addEventListener('paste', function(e) {
            const target = e.target;
            if (target.tagName !== 'TEXTAREA') return;
            if (!target.classList.contains(TARGET_CLASS) &&
                !target.closest('.main-dialog') &&
                !target.closest('.ai-evaluate') &&
                !target.closest('[class*="answer"]')) {
                // 如果完全无法匹配，也尝试（因为可能是动态类名）
                return;
            }

            // 获取剪贴板文字
            const text = (e.clipboardData || window.clipboardData)?.getData?.('text/plain') || '';
            if (!text) return;

            LOG('✂️ 拦截到 paste，文字长度: ' + text.length);

            // 阻止事件传递到页面
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // 直接插入文字
            injectText(target, text);
        }, true); // CAPTURE phase - 比页面的 handler 先执行

        LOG('✅ Capture-phase paste 拦截器已安装');
    }

    // =============================================
    // 文字注入（兼容 React 受控组件）
    // =============================================
    function injectText(textarea, text) {
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;

        // 方法1: 使用原生 setter 绕过 React 的 value 劫持
        try {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                HTMLTextAreaElement.prototype, 'value'
            )?.set;
            const nativeGet = Object.getOwnPropertyDescriptor(
                HTMLTextAreaElement.prototype, 'value'
            )?.get;

            if (nativeSetter) {
                const currentValue = nativeGet ? nativeGet.call(textarea) : textarea.value;
                const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
                nativeSetter.call(textarea, newValue);
                textarea.selectionStart = textarea.selectionEnd = start + text.length;

                LOG('✅ 通过原生 setter 注入成功');
            } else {
                textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
                textarea.selectionStart = textarea.selectionEnd = start + text.length;
                LOG('✅ 直接 value 赋值');
            }
        } catch(e) {
            // 兜底
            textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
            LOG('⚠️ 使用兜底方式注入');
        }

        // 派发事件，通知 React/Vue 状态已变更
        // 使用 insertText 类型模拟打字而非粘贴，绕过粘贴检测
        fireInputEvents(textarea, text);
    }

    function fireInputEvents(textarea, text) {
        // InputEvent - 模拟正常输入
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text,
            isComposing: false,
        });

        // 先 focus
        textarea.focus();

        // 派发 input 事件
        textarea.dispatchEvent(inputEvent);

        // 再派发 change 事件（有些框架监听 change）
        const changeEvent = new Event('change', { bubbles: true });
        textarea.dispatchEvent(changeEvent);
    }

    // =============================================
    // 清理元素上的限制属性
    // =============================================
    function cleanTextarea(textarea) {
        if (!textarea || textarea.__cxCleaned) return;
        textarea.__cxCleaned = true;

        // 移除 paste 相关的事件属性
        ['onpaste', 'oncopy', 'oncut', 'onkeydown', 'oncontextmenu', 'onselectstart'].forEach(attr => {
            textarea.removeAttribute(attr);
            textarea[attr] = null;
        });

        // 确保可编辑
        textarea.removeAttribute('readonly');
        textarea.removeAttribute('disabled');

        LOG('🧹 已清理 textarea: ' + (textarea.id || textarea.className?.substring(0, 30)));
    }

    // =============================================
    // 扫描并清理所有目标 textarea
    // =============================================
    function scanAndCleanTextareas() {
        const textareas = document.querySelectorAll('textarea.' + TARGET_CLASS);
        textareas.forEach(cleanTextarea);
        if (textareas.length > 0) {
            LOG('🔍 发现 ' + textareas.length + ' 个目标 textarea');
        }

        // 也清理其他可能的 textarea（以防 class 名变化）
        document.querySelectorAll('textarea').forEach(el => {
            if (el.closest('.main-dialog') ||
                el.closest('.ai-evaluate') ||
                el.closest('[class*="answer"]') ||
                el.closest('[class*="evaluate"]') ||
                el.closest('[class*="dialog"]')) {
                cleanTextarea(el);
            }
        });
    }

    // =============================================
    // MutationObserver 监控新元素
    // =============================================
    function startObserver() {
        const observer = new MutationObserver(mutations => {
            let shouldScan = false;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.matches?.('textarea')) {
                        cleanTextarea(node);
                        shouldScan = true;
                    }
                    if (node.querySelectorAll?.('textarea').length > 0) {
                        shouldScan = true;
                    }
                });
            });
            if (shouldScan) {
                setTimeout(scanAndCleanTextareas, 100);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        LOG('✅ MutationObserver 已启动');
    }

    // =============================================
    // 悬浮粘贴按钮
    // =============================================
    function injectFloatingButton() {
        const btn = document.createElement('div');
        btn.id = '__cx_paste_btn';
        btn.innerHTML = '📋';
        btn.title = '点击粘贴剪贴板内容';
        btn.style.cssText = [
            'position:fixed',
            'bottom:80px',
            'right:20px',
            'z-index:99999',
            'width:48px',
            'height:48px',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'background:#1677ff',
            'color:#fff',
            'border:none',
            'border-radius:50%',
            'font-size:20px',
            'cursor:pointer',
            'box-shadow:0 4px 16px rgba(22,119,255,0.5)',
            'user-select:none',
            'transition:transform 0.15s, box-shadow 0.15s',
        ].join(';');

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 6px 20px rgba(22,119,255,0.6)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 16px rgba(22,119,255,0.5)';
        });

        btn.addEventListener('click', async () => {
            // 找目标 textarea
            let textarea = document.querySelector('textarea.' + TARGET_CLASS);
            if (!textarea) {
                // 尝试找任何可见的 textarea
                const allTA = document.querySelectorAll('textarea');
                for (const ta of allTA) {
                    if (ta.offsetParent !== null) {
                        textarea = ta;
                        break;
                    }
                }
            }

            if (!textarea) {
                alert('未找到编辑区域，请先点击答题框');
                return;
            }

            textarea.focus();

            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    injectText(textarea, text);
                    LOG('✅ 悬浮按钮粘贴成功');
                } else {
                    alert('剪贴板为空');
                }
            } catch(e) {
                // clipboard API 被拒
                const text = prompt('请输入要粘贴的文字：');
                if (text) injectText(textarea, text);
            }
        });

        document.body.appendChild(btn);
        LOG('✅ 悬浮粘贴按钮已注入');
    }

    // =============================================
    // 快捷键 Ctrl+Shift+V 备用
    // =============================================
    function installHotkey() {
        document.addEventListener('keydown', async function(e) {
            if (!(e.ctrlKey && e.shiftKey && e.key === 'V')) return;

            const textarea = document.querySelector('textarea.' + TARGET_CLASS) ||
                           document.querySelector('textarea:not([style*="display:none"])');

            if (!textarea) return;

            e.preventDefault();
            e.stopPropagation();

            textarea.focus();
            try {
                const text = await navigator.clipboard.readText();
                if (text) injectText(textarea, text);
            } catch(ex) {
                const text = prompt('剪贴板读取失败，请粘贴：');
                if (text) injectText(textarea, text);
            }
        }, true);
        LOG('✅ Ctrl+Shift+V 快捷键已注册');
    }

    // =============================================
    // 定期扫描（兜底，处理延迟渲染）
    // =============================================
    function startPeriodicScan() {
        let count = 0;
      