import { build } from "esbuild";

const banner = `// ==UserScript==
// @name            Bilibili 屏蔽视频脚本-改
// @version         1.5.0
// @description     对 Bilibili.com 的视频卡片元素，以标题、UP 主、标签、双重标签、充电专属、收藏投币比、竖屏、时长、播放量、点赞率、视频分区、UP 主等级、UP 主粉丝数、UP 主简介、精选评论、置顶评论来判断匹配，添加覆盖叠加层或隐藏视频，隐藏或屏蔽热搜、附带去除广告等非视频元素的功能。
// @author          tjxwork
// @license        MIT
// @icon            https://www.bilibili.com/favicon.ico
// @match           https://www.bilibili.com/
// @match           https://live.bilibili.com/*
// @match           https://search.bilibili.com/*
// @match           https://space.bilibili.com/*
// @match           https://account.bilibili.com/*
// @match           https://message.bilibili.com/*
// @match           https://t.bilibili.com/*
// @match           https://link.bilibili.com/*
// @match           https://www.bilibili.com/video/*
// @match           https://www.bilibili.com/video/*/*
// @match           https://www.bilibili.com/video/BV*
// @grant           GM_registerMenuCommand
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// ==/UserScript==
"use strict";`;

await build({
  entryPoints: ["src/main.js"],
  outfile: "bilibili_blocked_videos_by_tags.user.js",
  bundle: true,
  format: "iife",
  target: ["chrome100"],
  banner: { js: banner },
  legalComments: "none",
  logLevel: "info",
});
