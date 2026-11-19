# 0.18.4 · Windows 退出修复

Windows 修复开启系统音频时退出卡死、音频快速开关后退出等待的问题。采集在后台释放，窗口继续处理消息；重复退出只执行一次清理，异常驱动最多等待 3 秒。主窗口底部增加“退出软件”，隐藏托盘时仍可退出。关闭主窗口仍表示后台运行。

## 下载

此页统一提供 Windows 0.18.4 与现有 Mac 0.18.3。Mac 二进制保持原字节，本轮没有重新安装或替换 Mac 程序。Windows 两种安装器任选一种。

- [ChatGPT-Pulse-0.18.4-windows-x64-music-offline-setup.exe](https://github.com/voidlph-dev/chatgpt-pulse/releases/download/v0.18.4/ChatGPT-Pulse-0.18.4-windows-x64-music-offline-setup.exe)：默认完整离线版，包含微软 WebView2 安装组件。
- [ChatGPT-Pulse-0.18.4-windows-x64-music-online-setup.exe](https://github.com/voidlph-dev/chatgpt-pulse/releases/download/v0.18.4/ChatGPT-Pulse-0.18.4-windows-x64-music-online-setup.exe)：小体积联网版，缺少 WebView2 时需联网补齐。
- [ChatGPT-Pulse-0.18.3-mac-universal.dmg](https://github.com/voidlph-dev/chatgpt-pulse/releases/download/v0.18.4/ChatGPT-Pulse-0.18.3-mac-universal.dmg)
- [ChatGPT-Pulse-0.18.3-mac-universal.zip](https://github.com/voidlph-dev/chatgpt-pulse/releases/download/v0.18.4/ChatGPT-Pulse-0.18.3-mac-universal.zip)
- [ChatGPT-Pulse-0.18.4-source.zip](https://github.com/voidlph-dev/chatgpt-pulse/releases/download/v0.18.4/ChatGPT-Pulse-0.18.4-source.zip)
- [SHA256SUMS.txt](https://github.com/voidlph-dev/chatgpt-pulse/releases/download/v0.18.4/SHA256SUMS.txt)
- [Windows 退出验收](https://github.com/voidlph-dev/chatgpt-pulse/releases/download/v0.18.4/WINDOWS_EXIT_FIX_VALIDATION.json) · [两端构建来源](https://github.com/voidlph-dev/chatgpt-pulse/releases/download/v0.18.4/BUILD_PROVENANCE.json)

## 验证范围

本地通过 129 项 Mac Rust、84 项前端、30 套界面和 7 项不新增音频授权的原生退出回归。Windows 云端执行实际程序的七种退出场景，核对正常退出码、无强制终止信号和采集线程释放；安装后对相同二进制重跑。具体状态与音频设备可用性以随包 JSON 为准，确定性退出竞争使用隔离夹具，不冒充真实音频。

云端安装验收已有 WebView2，不代表真正断网、没有 WebView2 的干净系统已测。Windows 10、报告问题的用户原电脑、其他硬件、真实音乐及设备切换、新标准用户和 SmartScreen 信誉仍需复测。两包未签名；Mac 仍为临时签名、未公证。Mac 0.18.3 的历史真实音频范围见 [Mac 修复报告](MAC_AUDIO_STARTUP_0.18.3.md)，Windows 0.18.2 的历史功能范围见 [原音乐报告](WINDOWS_MUSIC_REPORT.md)，两者均不当作本次 Windows 实机结果。

升级保留设置、头像和可选数字摘要；旧版若已卡死，先在任务管理器结束 ChatGPT Pulse，再运行新版安装器，无需删除用户数据。根许可、角色说明、非商用条件及已有实机演示保持不变。
