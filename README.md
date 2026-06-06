# 超星 AI 评测粘贴解锁

解除超星学习通 AI 评测页面 (`mooc2-ans.chaoxing.com/mooc2-ans/ai-evaluate`) 的粘贴限制，支持 **Ctrl+V 粘贴** 和**悬浮按钮粘贴**。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击下方链接安装脚本：
   - [从 GitHub 安装](https://github.com/2750527986liu-maker/Chaoxing-AI-Paste-Unlock/raw/main/chaoxing-ai-paste-unlock.user.js)
3. 打开超星 AI 评测页面，直接 Ctrl+V 即可粘贴

## 功能

- ✅ **Ctrl+V 直接粘贴** — capture 阶段拦截 paste 事件，阻止页面检测
- ✅ **悬浮粘贴按钮** — 右下角蓝色按钮，点击即可粘贴剪贴板内容
- ✅ **Ctrl+Shift+V 备用快捷键** — 通过剪贴板 API 读取并注入
- ✅ **自动清理限制** — 移除 textarea 上的 readonly/disabled/onpaste 等限制
- ✅ **动态监听** — MutationObserver 监控动态加载的编辑器元素
- ✅ **React 兼容** — 通过原生 setter + InputEvent 支持 React 受控组件

## 原理

超星 AI 评测页面在 `<textarea class="main-dialog-textarea">` 上绑定了 `onpaste` 事件处理器，在 bubble 阶段调用 `preventDefault()` 阻止粘贴。

本脚本在 **capture 阶段**（先于页面处理器）拦截 paste 事件：

1. 调用 `stopPropagation()` + `stopImmediatePropagation()` 阻止页面处理器看到此事件
2. 通过 `HTMLTextAreaElement.prototype.value` 原生 setter 直接注入文字
3. 使用 `InputEvent({inputType: 'insertText'})` 模拟正常打字，绕过 paste 检测

## 适用页面

- `mooc2-ans.chaoxing.com/mooc2-ans/ai-evaluate/*` — AI 评测答题页
- 其他使用 `main-dialog-textarea` 的超星页面

## 声明

本工具仅供日常作业编辑便利使用，请勿用于考试作弊。使用本脚本产生的任何后果由用户自行承担。

## License

MIT
