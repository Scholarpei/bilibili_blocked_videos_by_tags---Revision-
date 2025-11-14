// ==UserScript==
// @name            Bilibili 屏蔽视频脚本-改
// @version         1.4.6
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
// @match           https://space.bilibili.com/*
// @grant           GM_registerMenuCommand
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// @require         https://cdnjs.cloudflare.com/ajax/libs/vue/3.2.31/vue.global.min.js
// @require         https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.min.js
// ==/UserScript==
"use strict";

(function() {
    'use strict';

    // Hook history API
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    function hook(type, original) {
        return function() {
            const result = original.apply(this, arguments);
            window.dispatchEvent(new Event('urlchange'));
            return result;
        }
    }

    history.pushState = hook('pushState', pushState);
    history.replaceState = hook('replaceState', replaceState);

    window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('urlchange'));
    });

    // 监听 URL 变化
    window.addEventListener('urlchange', () => {
        console.log('[脚本] URL 变化检测到，重新初始化脚本');
        restoreScript();
    });

    // 页面首次加载
    document.addEventListener('DOMContentLoaded', restoreScript);

    // 你的初始化逻辑
    function restoreScript() {
        // 避免多次重复安装
        if (document.querySelector('#your-script-installed-flag')) return;

        console.log('[脚本] 初始化开始');

        // 插入标记
        let flag = document.createElement('div');
        flag.id = 'your-script-installed-flag';
        flag.style.display = 'none';
        document.body.appendChild(flag);

        // TODO：你脚本原本初始化逻辑全部放这里
        initUI();
        initBlockButtons();
        initMutationObserver();
    }

})();

const OPENROUTER_API_KEY =
  "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";
const pendingApiRequests = {}; // 用于存储待处理的 API 请求

let blockedParameter = GM_getValue("GM_blockedParameter", {
  blockedBelowVideoFavorite_Switch: false,
  blockedBelowVideoFavorite: 0,

  blockedTitle_Switch: false,
  blockedTitle_UseRegular: true,
  blockedTitle_Array: [],

  blockedNameOrUid_Switch: true,
  blockedNameOrUid_UseRegular: false,
  blockedNameOrUid_Array: [],

  blockedVideoPartitions_Switch: true,
  blockedVideoPartitions_UseRegular: false,
  blockedVideoPartitions_Array: [],

  blockedTag_Switch: false,
  blockedTag_UseRegular: true,
  blockedTag_Array: [],

  doubleBlockedTag_Switch: false,
  doubleBlockedTag_UseRegular: true,
  doubleBlockedTag_Array: [],

  blockedShortDuration_Switch: false,
  blockedShortDuration: 0,

  blockedBelowVideoViews_Switch: false,
  blockedBelowVideoViews: 0,

  blockedBelowLikesRate_Switch: false,
  blockedBelowLikesRate: 0,

  blockedBelowCoinRate_Switch: false,
  blockedBelowCoinRate: 0,

  blockedAboveFavoriteCoinRatio_Switch: false,
  blockedAboveFavoriteCoinRatio: 10,

  blockedPortraitVideo_Switch: false,

  blockedChargingExclusive_Switch: false,

  blockedFilteredCommentsVideo_Switch: false,

  blockedTopComment_Switch: false,
  blockedTopComment_UseRegular: true,
  blockedTopComment_Array: [],

  blockedBelowUpLevel_Switch: false,
  blockedBelowUpLevel: 0,

  blockedBelowUpFans_Switch: false,
  blockedBelowUpFans: 0,

  blockedUpSigns_Switch: false,
  blockedUpSigns_UseRegular: true,
  blockedUpSigns_Array: [],

  whitelistNameOrUid_Switch: false,
  whitelistNameOrUid_Array: [],

  hideTrending_Switch: false,

  blockedTrendingItemByTitleTag_Switch: false,

  blockedTrendingItem_Switch: false,
  blockedTrendingItem_UseRegular: true,
  blockedTrendingItem_Array: [],

  hideNonVideoElements_Switch: true,

  blockedOverlayOnlyDisplaysType_Switch: false,

  hideVideoMode_Switch: false,

  consoleOutputLog_Switch: false,
});

const noBlockedVideoUrls = [
  /^https:\/\/www\.bilibili\.com\/anime\//,
  /^https:\/\/live\.bilibili\.com\//,
  /^https:\/\/account\.bilibili\.com\//,
  /^https:\/\/message\.bilibili\.com\//,
  /^https:\/\/t\.bilibili\.com\//,
  /^https:\/\/space\.bilibili\.com\/[0-9]+/,
  /^https:\/\/www\.bilibili\.com\/history/,
  /^https:\/\/link\.bilibili\.com\//,
];

function oldParameterAdaptation(obj) {
  if (Object.prototype.hasOwnProperty.call(obj, "blockedTitleArray")) {
    obj["blockedTitle_Switch"] = true;
    obj["blockedTitle_UseRegular"] = true;
    obj["blockedTitle_Array"] = obj["blockedTitleArray"];
    delete obj["blockedTitleArray"];

    obj["blockedNameOrUid_Switch"] = true;
    obj["blockedNameOrUid_UseRegular"] = true;
    obj["blockedNameOrUid_Array"] = obj["blockedNameOrUidArray"];
    delete obj["blockedNameOrUidArray"];

    obj["blockedVideoPartitions_Switch"] = false;
    obj["blockedVideoPartitions_UseRegular"] = false;
    obj["blockedVideoPartitions_Array"] = [];

    obj["blockedTag_Switch"] = true;
    obj["blockedTag_UseRegular"] = true;
    obj["blockedTag_Array"] = obj["blockedTagArray"];
    delete obj["blockedTagArray"];

    obj["doubleBlockedTag_Switch"] = true;
    obj["doubleBlockedTag_UseRegular"] = true;
    obj["doubleBlockedTag_Array"] = obj["doubleBlockedTagArray"];
    delete obj["doubleBlockedTagArray"];

    obj["blockedShortDuration_Switch"] = true;

    obj["whitelistNameOrUid_Switch"] = false;
    obj["whitelistNameOrUid_Array"] = [];

    obj["hideVideoMode_Switch"] = obj["hideVideoModeSwitch"];
    delete obj["hideVideoModeSwitch"];

    obj["consoleOutputLog_Switch"] = obj["consoleOutputLogSwitch"];
    delete obj["consoleOutputLogSwitch"];

    if (!obj.hasOwnProperty("blockedBelowVideoFavorite_Switch")) {
      obj["blockedBelowVideoFavorite_Switch"] = false;
      obj["blockedBelowVideoFavorite"] = 0;
    }
  }
}
oldParameterAdaptation(blockedParameter);

GM_addStyle(`
:root {
    --uiBackgroundColor: #242424;
    --uiInputContainerBackgroundColor: #2e2e2e;
    --uiInputBoxBackgroundColor: #3a3a3a;
    --uiScrollbarBackgroundColor: #4a4a4a;
    --uiTextColor: #ffffff;
    --uiButtonColor: #558EFF;
    --uiBorderColor: rgba(0, 0, 0, 0);
    --uiPromptBoxColor: #1f1f1f;
    --blockedOverlayColor: rgba(36, 36, 36, 0.85);
    --fontSize: 16px;
    --lineHeight: 24px;
    --borderRadius: 4px;
}

#blockedMenuUi {
    font-size: var(--fontSize);
    position: fixed;
    bottom: 6vh;
    right: 2vw;
    z-index: 10005;
    width: 460px;
    max-height: 86vh;
    overflow-y: auto;
    background-color: var(--uiBackgroundColor);
}

#blockedMenuUi,
#blockedMenuUi * {
    color: var(--uiTextColor);
    box-sizing: border-box;
    border-style: solid;
    border-width: 0px;
    border-color: var(--uiBorderColor);
    border-radius: var(--borderRadius);
    line-height: var(--lineHeight);
    vertical-align: middle;
    font-family: "Cascadia Mono", Monaco, Consolas, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
}

#blockedMenuUi::-webkit-scrollbar,
#blockedMenuUi ul::-webkit-scrollbar {
    width: 7px;
}

#blockedMenuUi::-webkit-scrollbar-track,
#blockedMenuUi ul::-webkit-scrollbar-track {
    background: var(--uiScrollbarBackgroundColor);
    border-radius: 7px;
}

#blockedMenuUi::-webkit-scrollbar-thumb,
#blockedMenuUi ul::-webkit-scrollbar-thumb {
    background: var(--uiInputContainerBackgroundColor);
    border-radius: 7px;
}

#blockedMenuUi::-webkit-scrollbar-thumb:hover,
#blockedMenuUi ul::-webkit-scrollbar-thumb:hover {
    background: var(--uiInputBoxBackgroundColor);
    border-radius: 7px;
}

#blockedMenuUi::-webkit-scrollbar-thumb:active,
#blockedMenuUi ul::-webkit-scrollbar-thumb:active {
    background: var(--uiButtonColor);
    border-radius: 7px;
}

#menuTitle {
    font-size: 17px;
    text-align: center;
    margin: 10px;
}

.menuOptions {
    background-color: var(--uiInputContainerBackgroundColor);
    padding: 10px;
    margin: 0 10px;
    margin-bottom: 10px;
}

.titleLabelLeft {
    display: inline-block;
    width: 275px;
    margin-bottom: 5px;
}

.titleLabelRight {
    display: inline-block;
    margin-bottom: 5px;
}

#blockedMenuUi label {
    font-size: 16px;
    vertical-align: middle;
}

#blockedMenuUi input {
    background-color: var(--uiInputBoxBackgroundColor);
    font-size: var(--fontSize);
    line-height: var(--lineHeight);
    border-radius: var(--borderRadius);
    padding: 0 5px;
    margin-bottom: 5px;
    width: 360px;
    vertical-align: middle;
}

#blockedMenuUi input[type="number"] {
    width: 5em;
    margin: 0 5px;
    padding: 0 5px;
    text-align: right;
    appearance: none;
}

#blockedMenuUi input[type="number"]::-webkit-inner-spin-button,
#blockedMenuUi input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

#blockedMenuUi input[type="checkbox"] {
    width: 16px;
    height: 16px;
    margin: 0;
    margin-bottom: 2.5px;
    margin-right: 5px;
    appearance: none;
    border: 1.5px solid var(--uiTextColor);
    border-radius: 8px;
}

#blockedMenuUi input[type="checkbox"]:checked {
    border: 3px solid;
    background-color: var(--uiButtonColor);
}

#blockedMenuUi button {
    line-height: var(--lineHeight);
    border-radius: var(--borderRadius);
    padding: 0;
    margin-bottom: 5px;
    margin-left: 5px;
    width: 47px;
    vertical-align: middle;
    background-color: var(--uiButtonColor);
    transition: background-color 0.1s ease;
}

#blockedMenuUi button:hover {
    background-color: rgb(17, 154, 204);
}

#blockedMenuUi button:active {
    background-color: rgb(62, 203, 255);
}

#blockedMenuUi ul {
    background-color: var(--uiInputBoxBackgroundColor);
    font-size: 14px;
    padding: 5px 5px 0px 0px;
    margin-inline: 0px;
    margin: 0;
    width: 100%;
    min-height: 34px;
    max-height: 92px;
    overflow-y: auto;
}

#blockedMenuUi li {
    line-height: var(--lineHeight);
    border-radius: var(--borderRadius);
    display: inline-block;
    padding: 0 5px;
    margin-bottom: 5px;
    margin-left: 5px;
    vertical-align: middle;
    background-color: var(--uiButtonColor);
}


#blockedMenuUi li button {
    width: 20px;
    margin: 0px;
    padding: 0 0 3px 0;
    font-size: 24px;
    line-height: 18px;
    border: 0px;
}

#blockedMenuUi li button:hover {
    background-color: var(--uiButtonColor);
    color: rgb(221, 221, 221);
}

#blockedMenuUi li button:active {
    background-color: var(--uiButtonColor);
    color: var(--uiButtonColor);
}

#blockedMenuUi textarea {
    background-color: var(--uiInputBoxBackgroundColor);
    font-size: 14px;
    padding: 0 5px;
    width: 100%;
    resize: none;
}

#menuButtonContainer {
    position: sticky;
    right: 0;
    bottom: 0;
    width: 100%;
    background-color: var(--uiBackgroundColor);
    margin-top: -10px;
}

#menuButtonContainer button {
    line-height: var(--lineHeight);
    border-radius: var(--borderRadius);
    font-size: 16px;
    border: 0;
    padding: 0;
    margin-top: 10px;
    margin-bottom: 10px;
    margin-left: 10px;
    height: 45px;
    width: 45px;
    vertical-align: middle;
    background-color: var(--uiButtonColor);
}


#blockedMenuPrompt {
    position: fixed;
    bottom: calc(6vh - 37px);
    right: calc(2vw + 7px);
    z-index: 1006;
    line-height: 30px;
    border-radius: var(--borderRadius);
    padding: 0 15px;
    margin: 0;
    height: 30px;
    vertical-align: middle;
    text-align: center;
    background-color: var(--uiInputBoxBackgroundColor);
    transition: opacity 0.5s ease;
    pointer-events: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

#alipayWeChatQrCode {
    color: white;
    background-color: black;
    padding: 10px;
    position: fixed;
    top: 52%;
    left: 16%;
    transform: translate(0%, -50%);
}

@media (min-width: 2060px),
       (min-width: 1560px) and (max-width: 2059.9px),
       (min-width: 1400px) and (max-width: 1559.9px) {
    .recommended-container_floor-aside .container>*:nth-of-type(n + 8),
    .recommended-container_floor-aside .container.is-version8>*:nth-of-type(n + 13) {
        margin-top: 0;
    }
}

@media (min-width: 1300px) and (max-width: 1399.9px),
       (max-width: 1139.9px) {
    .recommended-container_floor-aside .container>*:nth-of-type(n + 6),
    .recommended-container_floor-aside .container.is-version8>*:nth-of-type(n + 13) {
        margin-top: 0;
    }
}

.hideAD {
    display: none !important;
}

`);

let menuUiHTML = `

<div id="blockedMenuUi">
    <div id="menuTitle">Bilibili按标签、标题、时长、UP主屏蔽视频 v1.4.6</div>

    <div id="menuOptionsList">
        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="视频API，是拿到视频的收藏数后判断的"><input type="checkbox"
                        v-model="menuUiSettings.blockedBelowVideoFavorite_Switch" />屏蔽低于此收藏数的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedBelowVideoFavorite" />
            <label>次</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="不需要API，网页上直接有标题信息"><input type="checkbox" v-model="menuUiSettings.blockedTitle_Switch" />按标题屏蔽视频(?)</label>
            </div>

            <div class="titleLabelRight">
                <label title="正则是什么可以问AI，你也可以理解成模糊匹配"><input type="checkbox" v-model="menuUiSettings.blockedTitle_UseRegular" />启用正则(?)</label>
            </div>

            <input type="text" placeholder="多项输入请用英文逗号间隔" spellcheck="false"
                v-model="tempInputValue.blockedTitle_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'blockedTitle_Array')">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.blockedTitle_Array">
                    {{value}}<button @click="delArrayButton(index, menuUiSettings.blockedTitle_Array)">×</button>
                </li>
            </ul>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="大部分情况也是可以在网页上直接拿到"><input type="checkbox" v-model="menuUiSettings.blockedNameOrUid_Switch" />按UP名称或Uid屏蔽视频(?)</label>
            </div>

            <div class="titleLabelRight">
                <label title="正则是什么可以问AI，你也可以理解成模糊匹配"><input type="checkbox" v-model="menuUiSettings.blockedNameOrUid_UseRegular" />启用正则(?)</label>
            </div>

            <input type="text" placeholder="多项输入请用英文逗号间隔" spellcheck="false"
                v-model="tempInputValue.blockedNameOrUid_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'blockedNameOrUid_Array')">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.blockedNameOrUid_Array">
                    {{value}}<button @click="delArrayButton(index, menuUiSettings.blockedNameOrUid_Array)">×</button>
                </li>
            </ul>
        </div>




        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="标签API，要注意有一些标签可能是分区"><input type="checkbox" v-model="menuUiSettings.blockedTag_Switch" />按标签屏蔽视频(?)</label>
            </div>

            <div class="titleLabelRight">
                <label title="正则是什么可以问AI，你也可以理解成模糊匹配"><input type="checkbox" v-model="menuUiSettings.blockedTag_UseRegular" />启用正则(?)</label>
            </div>

            <input type="text" placeholder="多项输入请用英文逗号间隔" spellcheck="false"
                v-model="tempInputValue.blockedTag_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'blockedTag_Array')">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.blockedTag_Array">
                    {{value}}<button @click="delArrayButton(index, menuUiSettings.blockedTag_Array)">×</button>
                </li>
            </ul>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="标签API，视频包含一对指定标签时才会生效，
专门用来屏蔽引战视频，例如：原神|鸣潮
这就看不到所有同时带“原神”“鸣潮”两个标签的视频。
要注意有一些标签可能是分区"><input type="checkbox" v-model="menuUiSettings.doubleBlockedTag_Switch" />按双重标签屏蔽视频(?)</label>
            </div>

            <div class="titleLabelRight">
                <label title="正则是什么可以问AI，你也可以理解成模糊匹配"><input type="checkbox" v-model="menuUiSettings.doubleBlockedTag_UseRegular" />启用正则(?)</label>
            </div>

            <input type="text" placeholder='多项输入请用英文逗号间隔(以"A标签|B标签"格式添加)' spellcheck="false"
                v-model="tempInputValue.doubleBlockedTag_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'doubleBlockedTag_Array' )">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.doubleBlockedTag_Array">
                    {{value}}<button @click="delArrayButton(index, menuUiSettings.doubleBlockedTag_Array)">×</button>
                </li>
            </ul>
        </div>


        <div class="menuOptions">
            <label title="视频API，是拿到视频的充电视频标记后判断的"><input type="checkbox" v-model="menuUiSettings.blockedChargingExclusive_Switch" />屏蔽充电专属的视频(?)</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="视频API，是拿到视频的收藏数和投币数后计算出比例后判断的，
简单来说，它可以一定程度上判断这个视频是不是刷数据的低质视频。
高质量的原创视频，收藏/投币的比，一般都不会高于5，
小于1反而是常态，高于10的有高概率是刷数据的视频。
具体的原理，请查看 v1.3.0 更新日志中的三个链接。
(只会处理播放数5000+、收藏数50+、发布时间2小时+的视频)
！！！对教程类视频可能会有严重误伤！！！"><input type="checkbox"
                        v-model="menuUiSettings.blockedAboveFavoriteCoinRatio_Switch" />屏蔽高于此收藏/投币比的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedAboveFavoriteCoinRatio" />
            <label></label>
        </div>

        <div class="menuOptions">
            <label title="视频API，是拿到视频的分辨率后判断的"><input type="checkbox" v-model="menuUiSettings.blockedPortraitVideo_Switch" />屏蔽竖屏视频(?)</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="视频API，是拿到视频的时长后判断的"><input type="checkbox" v-model="menuUiSettings.blockedShortDuration_Switch" />屏蔽低于此时长的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedShortDuration" />
            <label>秒</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="视频API，是拿到视频的播放量后判断的"><input type="checkbox"
                        v-model="menuUiSettings.blockedBelowVideoViews_Switch" />屏蔽低于此播放量的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedBelowVideoViews" />
            <label>次</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="视频API，是拿到视频的播放量和点赞数后判断的
意义不大，推荐使用 收藏/投币比 屏蔽"><input type="checkbox"
                        v-model="menuUiSettings.blockedBelowLikesRate_Switch" />屏蔽低于此点赞率的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedBelowLikesRate" />
            <label>%</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="视频API，是拿到视频的播放量和投币数后判断的
意义不大，推荐使用 收藏/投币比 屏蔽"><input type="checkbox"
                        v-model="menuUiSettings.blockedBelowCoinRate_Switch" />屏蔽低于此投币率的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedBelowCoinRate" />
            <label>%</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="视频API，现在视频的分区可能不是很好确定名字，可以看日志来判断"><input type="checkbox" v-model="menuUiSettings.blockedVideoPartitions_Switch" />按视频分区屏蔽视频(?)</label>
            </div>

            <div class="titleLabelRight">
                <label title="正则是什么可以问AI，你也可以理解成模糊匹配"><input type="checkbox" v-model="menuUiSettings.blockedVideoPartitions_UseRegular" />启用正则(?)</label>
            </div>

            <input type="text" placeholder="多项输入请用英文逗号间隔" spellcheck="false"
                v-model="tempInputValue.blockedVideoPartitions_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'blockedVideoPartitions_Array')">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.blockedVideoPartitions_Array">
                    {{value}}<button
                        @click="delArrayButton(index, menuUiSettings.blockedVideoPartitions_Array)">×</button>
                </li>
            </ul>
        </div>



        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="UP主API，是拿到UP主的等级信息后判断的"><input type="checkbox" v-model="menuUiSettings.blockedBelowUpLevel_Switch" />屏蔽低于此UP主等级的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedBelowUpLevel" />
            <label>级</label>
        </div>


        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="UP主API，是拿到UP主的等粉丝数后判断的"><input type="checkbox" v-model="menuUiSettings.blockedBelowUpFans_Switch" />屏蔽低于此UP主粉丝数的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedBelowUpFans" />
            <label>人</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="UP主API，是拿到UP主的关注数后判断的"><input type="checkbox" v-model="menuUiSettings.blockedAboveUpAttention_Switch" />屏蔽高于此UP主关注数的视频(?)</label>
            </div>
            <input type="number" spellcheck="false" v-model="menuUiSettings.blockedAboveUpAttention" />
            <label>人</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="UP主API，是拿到UP主的简介后判断的"><input type="checkbox" v-model="menuUiSettings.blockedUpSigns_Switch" />按UP主简介屏蔽视频(?)</label>
            </div>

            <div class="titleLabelRight">
                <label title="正则是什么可以问AI，你也可以理解成模糊匹配"><input type="checkbox" v-model="menuUiSettings.blockedUpSigns_UseRegular" />启用正则(?)</label>
            </div>

            <input type="text" placeholder="多项输入请用英文逗号间隔" spellcheck="false"
                v-model="tempInputValue.blockedUpSigns_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'blockedUpSigns_Array')">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.blockedUpSigns_Array">
                    {{value}}<button @click="delArrayButton(index, menuUiSettings.blockedUpSigns_Array)">×</button>
                </li>
            </ul>
        </div>



        <div class="menuOptions">
            <label title="评论API，极易请求过多导致拒绝"><input type="checkbox"
                    v-model="menuUiSettings.blockedFilteredCommentsVideo_Switch" />屏蔽精选评论的视频(?)</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="评论API，极易请求过多导致拒绝"><input type="checkbox" v-model="menuUiSettings.blockedTopComment_Switch" />按置顶评论屏蔽视频(?)</label>
            </div>

            <div class="titleLabelRight">
                <label title="正则是什么可以问AI，你也可以理解成模糊匹配"><input type="checkbox" v-model="menuUiSettings.blockedTopComment_UseRegular" />启用正则(?)</label>
            </div>

            <input type="text" placeholder="多项输入请用英文逗号间隔" spellcheck="false"
                v-model="tempInputValue.blockedTopComment_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'blockedTopComment_Array')">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.blockedTopComment_Array">
                    {{value}}<button @click="delArrayButton(index, menuUiSettings.blockedTopComment_Array)">×</button>
                </li>
            </ul>
        </div>



        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="白名单，在最后进行的判断，有最高的优先级"><input type="checkbox"
                        v-model="menuUiSettings.whitelistNameOrUid_Switch" />按UP名称或Uid避免屏蔽视频(?)</label>
            </div>

            <input type="text" placeholder='多项输入请用英文逗号间隔' spellcheck="false"
                v-model="tempInputValue.whitelistNameOrUid_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'whitelistNameOrUid_Array' )">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.whitelistNameOrUid_Array">
                    {{value}}<button @click="delArrayButton(index, menuUiSettings.whitelistNameOrUid_Array)">×</button>
                </li>
            </ul>
        </div>


        <div class="menuOptions">
            <label title="直接隐藏所有的热搜项"><input type="checkbox"
                    v-model="menuUiSettings.hideTrending_Switch" />隐藏搜索框的热搜内容(?)</label>
        </div>

        <div class="menuOptions">
            <label title="不用自己重新填了，直接按你有的标题屏蔽项来屏蔽热搜项"><input type="checkbox"
                    v-model="menuUiSettings.blockedTrendingItemByTitleTag_Switch" />按已有的标题项屏蔽热搜项(?)</label>
        </div>

        <div class="menuOptions">
            <div class="titleLabelLeft">
                <label title="类似标题的用法，感觉不是很有必须单独做出来"><input type="checkbox"
                        v-model="menuUiSettings.blockedTrendingItem_Switch" />按关键字屏蔽热搜项(?)</label>
            </div>

            <div class="titleLabelRight">
                <label title="正则是什么可以问AI，你也可以理解成模糊匹配"><input type="checkbox" v-model="menuUiSettings.blockedTrendingItem_UseRegular" />启用正则(?)</label>
            </div>

            <input type="text" placeholder='多项输入请用英文逗号间隔' spellcheck="false"
                v-model="tempInputValue.blockedTrendingItem_Array" /><button
                @click="addArrayButton(tempInputValue, menuUiSettings, 'blockedTrendingItem_Array' )">添加</button>

            <ul>
                <li v-for="(value, index) in menuUiSettings.blockedTrendingItem_Array">
                    {{value}}<button @click="delArrayButton(index, menuUiSettings.blockedTrendingItem_Array)">×</button>
                </li>
            </ul>
        </div>



        <div class="menuOptions">
            <label title="基本就是去各种广告、去直播、去综艺、去国漫、去搜索页推广之类的非投稿视频内容"><input type="checkbox"
                    v-model="menuUiSettings.hideNonVideoElements_Switch" />隐藏首页等页面的非视频元素(?)</label>
        </div>

        <div class="menuOptions">
            <label title="防止你连屏蔽词都恶心"><input type="checkbox" v-model="menuUiSettings.blockedOverlayOnlyDisplaysType_Switch" />屏蔽叠加层的提示只显示类型(?)</label>
        </div>

        <div class="menuOptions">
            <label title="我基本不用这个，为了方便判断屏蔽效果和范围"><input type="checkbox" v-model="menuUiSettings.hideVideoMode_Switch" />隐藏视频而不是使用叠加层覆盖(?)</label>
        </div>

        <div class="menuOptions">
            <label title="你可以看到一堆的报错！"><input type="checkbox" v-model="menuUiSettings.consoleOutputLog_Switch" />控制台输出日志开关(?)</label>
        </div>

    </div>

    <div id="menuButtonContainer">
        <button @click="refreshButton()">读取</button>
        <button @click="saveButton()">保存</button>
        <button @click="closeButton()">关闭</button>
        <button @click="exportButton()">导出</button>
        <button @click="importButton()">导入</button>
        <button @click="authorButton()">作者</button>
        <button @click="supportButton()">赞助</button>

    <div id="alipayWeChatQrCode" v-show="tempInputValue.QrCode_Switch">
        <label>感谢赞助，二维码暂停使用，即将跳转到爱发电</label>
    </div>

    <div id="blockedMenuPrompt"
        :style="{ opacity: tempInputValue.promptText_Opacity }"
        v-show="tempInputValue.promptText_Switch">
        {{tempInputValue.promptText}}
    </div>

</div>

`;

function blockedMenuUi() {
  if (!document.getElementById("blockedMenuUi")) {
    let menuUi = document.createElement("div");
    menuUi.innerHTML = menuUiHTML;
    document.body.appendChild(menuUi);
  } else {
    console.log("菜单 #blockedMenuUi 已存在");
    return;
  }

  unsafeWindow.Vue = Vue;

  const { createApp, reactive, toRaw } = Vue;

  createApp({
    setup() {
      const menuUiSettings = reactive({});

      const tempInputValue = reactive({
        blockedTitle_Array: "",
        blockedNameOrUid_Array: "",
        blockedVideoPartitions_Array: "",
        blockedTag_Array: "",
        doubleBlockedTag_Array: "",
        blockedTopComment_Array: "",
        blockedUpSigns_Array: "",
        whitelistNameOrUid_Array: "",
        blockedTrendingItem_Array: "",
        promptText_Switch: true,
        promptText_Opacity: 0,
        promptText: "",
        QrCode_Switch: false,
      });

      function showPromptText(text) {
        tempInputValue.promptText_Opacity = 1;
        tempInputValue.promptText = text;
        setTimeout(() => {
          tempInputValue.promptText_Opacity = 0;
        }, 1500);
      }

      const addArrayButton = (tempInputValue, menuUiSettings, keyName) => {
        if (!Array.isArray(menuUiSettings[keyName])) {
          menuUiSettings[keyName] = [];
        }
        if (
          keyName == "doubleBlockedTag_Array" &&
          tempInputValue[keyName].trim()
        ) {
          const items = tempInputValue[keyName]
            .split(",")
            .map((item) => item.split("|").map((str) => str.trim()))
            .filter(
              (subArray) =>
                subArray.length === 2 && subArray.every((str) => str !== "")
            );

          items.forEach((secondSplitItem) => {
            const formattedItem = secondSplitItem.join("|");
            menuUiSettings[keyName].push(formattedItem);
          });

          tempInputValue[keyName] = "";

          return;
        }

        if (tempInputValue[keyName].trim()) {
          const items = tempInputValue[keyName]
            .split(",")
            .map((item) => item.trim());

          menuUiSettings[keyName].push(...items);

          tempInputValue[keyName] = "";
        }
      };

      const delArrayButton = (index, array) => {
        array.splice(index, 1);
      };

      function deepCopy(source, target) {
        for (let key in source) {
          if (typeof source[key] === "object" && source[key] !== null) {
            target[key] = Array.isArray(source[key]) ? [] : {};
            deepCopy(source[key], target[key]);
          } else {
            target[key] = source[key];
          }
        }
      }

      const refreshButton = () => {
        deepCopy(blockedParameter, menuUiSettings);

        showPromptText("读取数据");
      };

      function deepCopyReactiveObject(reactiveObj, targetObj) {
        for (let key in reactiveObj) {
          const rawValue = toRaw(reactiveObj[key]);

          if (typeof rawValue === "object" && rawValue !== null) {
            targetObj[key] = Array.isArray(rawValue) ? [] : {};
            deepCopyReactiveObject(rawValue, targetObj[key]);
          } else {
            targetObj[key] = rawValue;
          }
        }
      }

      const saveButton = () => {
        deepCopyReactiveObject(menuUiSettings, blockedParameter);

        GM_setValue("GM_blockedParameter", blockedParameter);

        showPromptText("保存数据");

        FuckYouBilibiliRecommendationSystem();
      };

      const closeButton = () => {
        let elementToRemove = document.getElementById("blockedMenuUi");

        if (elementToRemove) {
          let parentElement = elementToRemove.parentNode;

          parentElement.removeChild(elementToRemove);
        }
      };

      const exportButton = () => {
        try {
          const rawSettings = toRaw(menuUiSettings);
          const jsonString = JSON.stringify(rawSettings, null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = `Bilibili_blocked_videos_by_tags_Config_${formatTimestamp(
            { separator: "-_-" }
          )}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          showPromptText("设置导出成功");
        } catch (error) {
          showPromptText("导出失败");
          console.error("导出设置时出错:", error);
        }
      };

      const importButton = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";

        input.onchange = async (event) => {
          const file = event.target.files[0];
          if (!file) return;

          try {
            const fileContent = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = (e) => reject(e.target.error);
              reader.readAsText(file);
            });

            const importedData = JSON.parse(fileContent);
            if (!validateSettings(importedData)) {
              throw new Error("无效的配置文件");
            }

            mergeSettings(importedData, menuUiSettings);
            showPromptText("设置已加载，请手动保存");
          } catch (error) {
            showPromptText("导入失败: 文件格式错误");
            console.error("导入设置时出错:", error);
          }
        };

        input.click();
      };

      function validateSettings(settings) {
        return [
          "blockedTitle_Switch",
          "blockedNameOrUid_Switch",
          "blockedTag_Switch",
        ].some((key) => settings.hasOwnProperty(key));
      }

      function mergeSettings(source, target) {
        Object.keys(source).forEach((key) => {
          if (Array.isArray(source[key])) {
            target[key] = [...source[key]];
          } else if (typeof source[key] === "object") {
            Object.assign(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        });
      }

      const authorButton = () => {
        setTimeout(() => {
          window.open("https://space.bilibili.com/351422438", "_blank");
        }, 1000);
        showPromptText("欢迎关注！");
      };

      const supportButton = () => {
        if (!tempInputValue.QrCode_Switch) {
          setTimeout(() => {
            window.open("https://afdian.com/a/tjxgame", "_blank");
          }, 1000);
          tempInputValue.QrCode_Switch = true;
        } else {
          tempInputValue.QrCode_Switch = false;
        }

        showPromptText("感谢老板！");
      };

      refreshButton();

      return {
        menuUiSettings,
        tempInputValue,
        addArrayButton,
        delArrayButton,
        refreshButton,
        saveButton,
        closeButton,
        exportButton,
        importButton,
        supportButton,
        authorButton,
      };
    },
  }).mount("#blockedMenuUi");
}

GM_registerMenuCommand("屏蔽参数面板", blockedMenuUi);

let videoInfoDict = {};

let videoUpInfoDict = {};

let lastConsoleVideoInfoDict = {};

function formatTimestamp({
  date = true,
  time = true,
  milliseconds = false,
  separator = "-_:.",
  onlyDate = false,
  onlyTime = false,
} = {}) {
  currentTime = new Date();

  const pad = (n, length = 2) => n.toString().padStart(length, "0");

  const year = currentTime.getFullYear();
  const month = pad(currentTime.getMonth() + 1);
  const day = pad(currentTime.getDate());
  let concatDate = [year, month, day];

  const hours = pad(currentTime.getHours());
  const minutes = pad(currentTime.getMinutes());
  const seconds = pad(currentTime.getSeconds());
  let concatTime = [hours, minutes, seconds];

  const millis = pad(currentTime.getMilliseconds(), 3);

  let outputTime = "";

  if (onlyDate) {
    date = true;
    time = false;
  }

  if (onlyTime) {
    date = false;
    time = true;
  }

  if (date === true && time === true && separator.length < 3) {
    outputTime =
      concatDate.join(separator[0]) +
      separator[0] +
      concatTime.join(separator[0]);
  }

  if (date === true && time === true && separator.length >= 3) {
    outputTime =
      concatDate.join(separator[0]) +
      separator[1] +
      concatTime.join(separator[2]);
  }

  if (date === true && time === false) {
    outputTime = concatDate.join(separator[0]);
  }

  if (date === false && time === true) {
    if (separator.length < 3) {
      outputTime = concatTime.join(separator[0]);
    } else {
      outputTime = concatTime.join(separator[2]);
    }
  }

  if (milliseconds) {
    if (separator.length < 3) {
      outputTime = outputTime + separator[0] + millis;
    } else if (separator.length === 3) {
      outputTime = outputTime + separator[2] + millis;
    } else {
      outputTime = outputTime + separator[3] + millis;
    }
  }

  return outputTime;
}

function consoleLogOutput(...args) {
  if (blockedParameter.consoleOutputLog_Switch) {
    let logTime = formatTimestamp({ onlyTime: true, milliseconds: true });

    let logArray = [logTime, ...args];
    console.log(...logArray);
  }
}

function objectDifferent(obj1, obj2) {
  if (Object.keys(obj1).length !== Object.keys(obj2).length) {
    return true;
  }
  for (const key in obj1) {
    if (obj1[key] !== obj2[key]) {
      return true;
    }
  }
  return false;
}

function getVideoElements() {
  let videoElements = document.querySelectorAll(
    "div.bili-video-card, div.video-page-card-small, li.bili-rank-list-video__item, div.video-card, li.rank-item, div.video-card-reco, div.video-card-common, div.rank-wrap"
  );

  videoElements = Array.from(videoElements).filter((element) =>
    element.querySelector("a")
  );

  if (document.querySelector("div.recommend-container__2-line") == null) {
    videoElements = Array.from(videoElements).filter(
      (element) => element.classList.value !== "bili-video-card is-rcmd"
    );
  }

  return videoElements;
}

function isAlreadyBlockedChildElement(videoElement) {
  if (videoElement.style.filter == "blur(5px)") {
    return true;
  }
}

function markAsBlockedTarget(videoBv, blockedType, blockedItem) {
  videoInfoDict[videoBv].blockedTarget = true;
  console.log("[屏蔽标记] BV:", videoBv, "rule:", blockedType, blockedItem);
  if (!videoInfoDict[videoBv].triggeredBlockedRules) {
    videoInfoDict[videoBv].triggeredBlockedRules = [];
  }

  let blockedRulesItem;

  if (blockedParameter.blockedOverlayOnlyDisplaysType_Switch) {
    blockedRulesItem = blockedType;
  } else {
    blockedRulesItem = blockedType + ": " + blockedItem;
  }

  if (
    !videoInfoDict[videoBv].triggeredBlockedRules.includes(blockedRulesItem)
  ) {
    videoInfoDict[videoBv].triggeredBlockedRules.push(blockedRulesItem);
  }
}

function getBvAndTitle(videoElement) {
  const videoLinkElements = videoElement.querySelectorAll("a");

  let videoBv;

  function av2bv(aid) {
    const XOR_CODE = 23442827791579n;
    const MASK_CODE = 2251799813685247n;
    const MAX_AID = 1n << 51n;
    const BASE = 58n;
    const data = "FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf";
    const bytes = ["B", "V", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
    let bvIndex = bytes.length - 1;
    let tmp = (MAX_AID | BigInt(aid)) ^ XOR_CODE;
    while (tmp > 0) {
      bytes[bvIndex] = data[Number(tmp % BigInt(BASE))];
      tmp = tmp / BASE;
      bvIndex -= 1;
    }
    [bytes[3], bytes[9]] = [bytes[9], bytes[3]];
    [bytes[4], bytes[7]] = [bytes[7], bytes[4]];
    return bytes.join("");
  }

  for (let videoLinkElement of videoLinkElements) {
    if (videoBv) {
      continue;
    }

    if (videoLinkElement.className == "other-link") {
      continue;
    }

    let videoAvTemp = videoLinkElement.href.match(/\/(av)(\d+)/);
    if (videoAvTemp) {
      videoBv = av2bv(videoAvTemp[2]);
    }

    let videoBvTemp = videoLinkElement.href.match(/\/(BV\w+)/);
    if (videoBvTemp) {
      videoBv = videoBvTemp[1];
    }

    if (!videoBv) {
      continue;
    }

    if (!videoInfoDict[videoBv]) {
      videoInfoDict[videoBv] = {};
    }

    videoInfoDict[videoBv].videoLink = videoLinkElement.href;
  }

  if (!videoBv) {
    return false;
  }

  videoInfoDict[videoBv].videoTitle =
    videoElement.querySelector("[title]:not(span)").title;

  return videoBv;
}

function handleBlockedTitle(videoBv) {
  if (!videoInfoDict[videoBv].videoTitle) {
    return;
  }

  if (blockedParameter.blockedTitle_UseRegular) {
    const blockedTitleHitItem = blockedParameter.blockedTitle_Array.find(
      (blockedTitleItem) => {
        const blockedTitleRegEx = new RegExp(blockedTitleItem);
        if (blockedTitleRegEx.test(videoInfoDict[videoBv].videoTitle)) {
          return true;
        }
      }
    );

    if (blockedTitleHitItem) {
      markAsBlockedTarget(videoBv, "按标题屏蔽", blockedTitleHitItem);
    }
  } else {
    const blockedTitleHitItem = blockedParameter.blockedTitle_Array.find(
      (blockedTitleItem) => {
        if (blockedTitleItem === videoInfoDict[videoBv].videoTitle) {
          return true;
        }
      }
    );

    if (blockedTitleHitItem) {
      markAsBlockedTarget(videoBv, "按标题屏蔽", blockedTitleHitItem);
    }
  }
}

function getNameAndUid(videoElement, videoBv) {
  if (videoInfoDict[videoBv].videoUpName && videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  const videoLinkElements = videoElement.querySelectorAll("a");

  for (let videoLinkElement of videoLinkElements) {
    const uidLink = videoLinkElement.href.match(/space\.bilibili\.com\/(\d+)/);
    if (uidLink) {
      videoInfoDict[videoBv].videoUpUid = uidLink[1];

      videoInfoDict[videoBv].videoUpName =
        videoLinkElement.querySelector("span").innerText;
    }
  }
}

function getVideoApiInfo(videoBv) {
  if (videoInfoDict[videoBv].videoDuration) {
    return;
  }

  // 🚀 添加防抖检查
  const requestKey = videoBv + "_info";
  if (pendingApiRequests[requestKey]) {
    return;
  }
  pendingApiRequests[requestKey] = true;

  const currentTime = new Date();
  if (
    videoInfoDict[videoBv].lastVideoInfoApiRequestTime &&
    currentTime - videoInfoDict[videoBv].lastVideoInfoApiRequestTime < 3000
  ) {
    delete pendingApiRequests[requestKey];
    return;
  }
  videoInfoDict[videoBv].lastVideoInfoApiRequestTime = currentTime;

  // 🚀 添加必要的请求头
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Referer: "https://www.bilibili.com/",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Origin: "https://www.bilibili.com",
  };

  fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${videoBv}`, {
    headers: headers,
    credentials: "include", // 🚀 包含cookies
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then((videoApiInfoJson) => {
      // 🚀 补充缺失的数据处理代码
      if (videoApiInfoJson.code !== 0) {
        throw new Error(`API Error: ${videoApiInfoJson.message}`);
      }

      videoInfoDict[videoBv].videoUpName = videoApiInfoJson.data.owner.name;
      videoInfoDict[videoBv].videoFavorite =
        videoApiInfoJson.data.stat.favorite;
      videoInfoDict[videoBv].videoUpUid = videoApiInfoJson.data.owner.mid;
      videoInfoDict[videoBv].videoAVid = videoApiInfoJson.data.aid;
      videoInfoDict[videoBv].videoPubdate = videoApiInfoJson.data.pubdate;
      videoInfoDict[videoBv].videoDuration = videoApiInfoJson.data.duration;
      videoInfoDict[videoBv].videoPartitions = videoApiInfoJson.data.tname;
      videoInfoDict[videoBv].videoView = videoApiInfoJson.data.stat.view;
      videoInfoDict[videoBv].videoLike = videoApiInfoJson.data.stat.like;
      videoInfoDict[videoBv].videoLikesRate = (
        (videoInfoDict[videoBv].videoLike / videoInfoDict[videoBv].videoView) *
        100
      ).toFixed(2);
      videoInfoDict[videoBv].videoCoin = videoApiInfoJson.data.stat.coin;
      videoInfoDict[videoBv].videoCoinRate = (
        (videoInfoDict[videoBv].videoCoin / videoInfoDict[videoBv].videoView) *
        100
      ).toFixed(2);
      videoInfoDict[videoBv].videoFavorite =
        videoApiInfoJson.data.stat.favorite;
      videoInfoDict[videoBv].videoFavoriteCoinRatio = (
        videoInfoDict[videoBv].videoFavorite / videoInfoDict[videoBv].videoCoin
      ).toFixed(2);
      videoInfoDict[videoBv].videoChargingExclusive =
        videoApiInfoJson.data.is_upower_exclusive;

      if (!videoInfoDict[videoBv].videoResolution) {
        videoInfoDict[videoBv].videoResolution = {};
      }
      videoInfoDict[videoBv].videoResolution.width =
        videoApiInfoJson.data.dimension.width;
      videoInfoDict[videoBv].videoResolution.height =
        videoApiInfoJson.data.dimension.height;

      // 🚀 请求完成，清除标记
      delete pendingApiRequests[requestKey];
      FuckYouBilibiliRecommendationSystem();
    })
    .catch((error) => {
      consoleLogOutput(videoBv, "getVideoApiInfo() Fetch错误:", error);
      // 🚀 请求失败，清除标记
      delete pendingApiRequests[requestKey];
    });
}

function handleBlockedShortDuration(videoBv) {
  if (!videoInfoDict[videoBv].videoDuration) {
    return;
  }

  if (
    blockedParameter.blockedShortDuration > videoInfoDict[videoBv].videoDuration
  ) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽低时长",
      videoInfoDict[videoBv].videoDuration + "秒"
    );
  }
}

function handleBlockedBelowVideoViews(videoBv) {
  if (!videoInfoDict[videoBv].videoView) {
    return;
  }

  if (
    blockedParameter.blockedBelowVideoViews > videoInfoDict[videoBv].videoView
  ) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽低播放量",
      videoInfoDict[videoBv].videoView + "次"
    );
  }
}

function handleBlockedBelowLikesRate(videoBv) {
  if (!videoInfoDict[videoBv].videoLikesRate) {
    return;
  }

  if (
    blockedParameter.blockedBelowLikesRate >
    videoInfoDict[videoBv].videoLikesRate
  ) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽低点赞率",
      videoInfoDict[videoBv].videoLikesRate + "%"
    );
  }
}

function handleBlockedBelowCoinRate(videoBv) {
  if (!videoInfoDict[videoBv].videoCoinRate) {
    return;
  }

  if (
    blockedParameter.blockedBelowCoinRate > videoInfoDict[videoBv].videoCoinRate
  ) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽低投币率",
      videoInfoDict[videoBv].videoCoinRate + "%"
    );
  }
}

function handleBlockedAboveFavoriteCoinRatio(videoBv) {
  if (videoInfoDict[videoBv].videoView < 5000) {
    return;
  }

  if (videoInfoDict[videoBv].videoFavorite < 50) {
    return;
  }

  const currentTimeInSeconds = Math.floor(Date.now() / 1000);

  if (currentTimeInSeconds - videoInfoDict[videoBv].videoPubdate < 7200) {
    return;
  }

  if (!videoInfoDict[videoBv].videoFavoriteCoinRatio) {
    return;
  }

  if (
    videoInfoDict[videoBv].videoFavoriteCoinRatio >
    blockedParameter.blockedAboveFavoriteCoinRatio
  ) {
    // 获取UP主的UID
    const upUid = videoInfoDict[videoBv].videoUpUid;

      consoleLogOutput(
        "自动屏蔽UP主 UID:",
        upUid,
        "名称:",
        videoInfoDict[videoBv].videoUpName,
        "收藏投币比:",
        videoInfoDict[videoBv].videoFavoriteCoinRatio
      );

    markAsBlockedTarget(
      videoBv,
      "屏蔽高收藏投币比",
      videoInfoDict[videoBv].videoFavoriteCoinRatio +
        "\nUP主: " +
        videoInfoDict[videoBv].videoUpName +
        "\n已自动添加到屏蔽列表"
    );
  }
}

function handleBlockedPortraitVideo(videoBv) {
  if (!videoInfoDict[videoBv].videoResolution?.width) {
    return;
  }

  if (
    videoInfoDict[videoBv].videoResolution.width <
    videoInfoDict[videoBv].videoResolution.height
  ) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽竖屏视频",
      `${videoInfoDict[videoBv].videoResolution.width} x ${videoInfoDict[videoBv].videoResolution.height}`
    );
  }
}

function handleBlockedChargingExclusive(videoBv) {
  if (videoInfoDict[videoBv].videoChargingExclusive) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽充电专属视频",
      videoInfoDict[videoBv].videoUpName
    );
  }
}

function handleBlockedBelowVideoFavorite(videoBv) {
  if (!videoInfoDict[videoBv].videoFavorite) {
    return;
  }

  if (
    blockedParameter.blockedBelowVideoFavorite >
    videoInfoDict[videoBv].videoFavorite
  ) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽低收藏数",
      videoInfoDict[videoBv].videoFavorite + "次收藏"
    );
  }
}

function handleBlockedNameOrUid(videoBv) {
  if (!videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  let blockedRulesItemText = "";

  if (blockedParameter.blockedNameOrUid_UseRegular) {
    const blockedNameOrUidHitItem =
      blockedParameter.blockedNameOrUid_Array.find((blockedNameOrUidItem) => {
        const blockedNameOrUidRegEx = new RegExp(blockedNameOrUidItem);

        if (blockedNameOrUidRegEx.test(videoInfoDict[videoBv].videoUpName)) {
          blockedRulesItemText = videoInfoDict[videoBv].videoUpName;
          return true;
        }

        if (blockedNameOrUidItem == videoInfoDict[videoBv].videoUpUid) {
          blockedRulesItemText = videoInfoDict[videoBv].videoUpUid;
          return true;
        }
      });

    if (blockedNameOrUidHitItem) {
      markAsBlockedTarget(videoBv, "按UP主屏蔽", blockedRulesItemText);

      // 🆕 自动触发"不想看此UP主"功能
      autoTriggerBlockUp(videoBv);
    }
  } else {
    const blockedNameOrUidHitItem =
      blockedParameter.blockedNameOrUid_Array.find((blockedNameOrUidItem) => {
        if (blockedNameOrUidItem == videoInfoDict[videoBv].videoUpName) {
          blockedRulesItemText = videoInfoDict[videoBv].videoUpName;
          return true;
        }

        if (blockedNameOrUidItem == videoInfoDict[videoBv].videoUpUid) {
          blockedRulesItemText = videoInfoDict[videoBv].videoUpUid;
          return true;
        }
      });

    if (blockedNameOrUidHitItem) {
      markAsBlockedTarget(videoBv, "按UP主屏蔽", blockedRulesItemText);

      // 🆕 自动触发"不想看此UP主"功能
      autoTriggerBlockUp(videoBv);
    }
  }
}

// 🆕 确保 autoTriggerBlockUp 函数完整
function autoTriggerBlockUp(videoBv) {
  if (!videoInfoDict[videoBv] || !videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  const upUid = videoInfoDict[videoBv].videoUpUid;
  const upName = videoInfoDict[videoBv].videoUpName;

  consoleLogOutput("自动触发屏蔽UP主:", upName, "UID:", upUid);

  // 调用屏蔽UP主的功能
  triggerBlockUpEvent(null, {
    bv: videoBv,
    upUid: upUid,
    upName: upName,
    _vts: Date.now(),
  });
}

function handleBlockedVideoPartitions(videoBv) {
  if (!videoInfoDict[videoBv].videoPartitions) {
    return;
  }

  let blockedRulesItemText = "";

  if (blockedParameter.blockedVideoPartitions_UseRegular) {
    const blockedVideoPartitionsHitItem =
      blockedParameter.blockedVideoPartitions_Array.find(
        (blockedVideoPartitionsItem) => {
          const blockedVideoPartitionsRegEx = new RegExp(
            blockedVideoPartitionsItem
          );

          if (
            blockedVideoPartitionsRegEx.test(
              videoInfoDict[videoBv].videoPartitions
            )
          ) {
            blockedRulesItemText = videoInfoDict[videoBv].videoPartitions;
            return true;
          }
        }
      );

    if (blockedVideoPartitionsHitItem) {
      markAsBlockedTarget(videoBv, "按视频分区屏蔽", blockedRulesItemText);
    }
  } else {
    const blockedVideoPartitionsHitItem =
      blockedParameter.blockedVideoPartitions_Array.find(
        (blockedVideoPartitionsItem) => {
          if (
            blockedVideoPartitionsItem == videoInfoDict[videoBv].videoPartitions
          ) {
            blockedRulesItemText = videoInfoDict[videoBv].videoPartitions;
            return true;
          }
        }
      );

    if (blockedVideoPartitionsHitItem) {
      markAsBlockedTarget(videoBv, "按视频分区屏蔽", blockedRulesItemText);
    }
  }
}

function getVideoApiUpInfo(videoBv) {
  if (!videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  const upUid = videoInfoDict[videoBv].videoUpUid;

  const currentTime = new Date();

  if (
    videoUpInfoDict[upUid]?.upLevel &&
    currentTime - videoUpInfoDict[upUid]?.updateTime < 3600000
  ) {
    videoInfoDict[videoBv].videoUpLevel = videoUpInfoDict[upUid].upLevel;
    videoInfoDict[videoBv].videoUpFans = videoUpInfoDict[upUid].upFans;
    videoInfoDict[videoBv].videoUpSign = videoUpInfoDict[upUid].upSign;
    return;
  }

  // 🚀 添加防抖检查
  const requestKey = videoBv + "_upinfo";
  if (pendingApiRequests[requestKey]) {
    return;
  }
  pendingApiRequests[requestKey] = true;

  if (
    videoInfoDict[videoBv]?.lastVideoUpInfoApiRequestTime &&
    currentTime - videoInfoDict[videoBv]?.lastVideoUpInfoApiRequestTime < 3000
  ) {
    delete pendingApiRequests[requestKey];
    return;
  }
  videoInfoDict[videoBv].lastVideoUpInfoApiRequestTime = currentTime;

  if (!videoUpInfoDict[upUid]) {
    videoUpInfoDict[upUid] = {};
  }

  fetch(`https://api.bilibili.com/x/web-interface/card?mid=${upUid}`)
    .then((response) => response.json())
    .then((videoApiUpInfoJson) => {
      // 🚀 补充缺失的数据处理代码
      videoUpInfoDict[upUid].upName = videoApiUpInfoJson.data.card.name;
      videoUpInfoDict[upUid].upLevel =
        videoApiUpInfoJson.data.card.level_info.current_level;
      videoInfoDict[videoBv].videoUpLevel =
        videoApiUpInfoJson.data.card.level_info.current_level;
      videoUpInfoDict[upUid].upFans = videoApiUpInfoJson.data.card.fans;
      videoInfoDict[videoBv].videoUpFans = videoApiUpInfoJson.data.card.fans;
      videoUpInfoDict[upUid].upSign = videoApiUpInfoJson.data.card.sign;
      videoInfoDict[videoBv].videoUpSign = videoApiUpInfoJson.data.card.sign;

      // 获取UP主关注数
      videoUpInfoDict[upUid].upAttention =
        videoApiUpInfoJson.data.card.attention;
      videoInfoDict[videoBv].videoUpAttention =
        videoApiUpInfoJson.data.card.attention;

      const currentTime = new Date();
      videoUpInfoDict[upUid].updateTime = currentTime;

      // 🚀 请求完成，清除标记
      delete pendingApiRequests[requestKey];
      FuckYouBilibiliRecommendationSystem();
    })
    .catch((error) => {
      consoleLogOutput(videoBv, "getVideoApiUpInfo() Fetch错误:", error);
      // 🚀 请求失败，清除标记
      delete pendingApiRequests[requestKey];
    });
}

function handleBlockedBelowUpLevel(videoBv) {
  if (!videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  const upUid = videoInfoDict[videoBv].videoUpUid;

  if (!videoUpInfoDict[upUid]?.upLevel) {
    return;
  }

  if (blockedParameter.blockedBelowUpLevel > videoUpInfoDict[upUid].upLevel) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽低UP主等级",
      videoUpInfoDict[upUid].upLevel + "级"
    );
  }
}

// 处理匹配的高于指定UP主关注数的视频
function handleBlockedBelowUpAttention(videoBv) {
  // 没有拿到UP主的Uid，跳过
  if (!videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  const upUid = videoInfoDict[videoBv].videoUpUid;
  // 没有拿到UP主关注数，跳过
  if (!videoUpInfoDict[upUid].upAttention) {
    return;
  }

  // 判断设置的屏蔽UP主关注数 是否大于 视频的UP主关注数
  if (
    blockedParameter.blockedAboveUpAttention <
    videoUpInfoDict[upUid].upAttention
  ) {
    // 标记为屏蔽目标并记录触发的规则
    markAsBlockedTarget(
      videoBv,
      "屏蔽高UP主关注数",
      videoUpInfoDict[upUid].upAttention + "人"
    );
  }
}

function handleBlockedBelowUpFans(videoBv) {
  if (!videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  const upUid = videoInfoDict[videoBv].videoUpUid;

  if (!videoUpInfoDict[upUid].upFans) {
    return;
  }

  if (blockedParameter.blockedBelowUpFans > videoUpInfoDict[upUid].upFans) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽低UP主粉丝数",
      videoUpInfoDict[upUid].upFans + "人"
    );
  }
}

function handleBlockedUpSigns(videoBv) {
  if (!videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  const upUid = videoInfoDict[videoBv].videoUpUid;

  if (!videoUpInfoDict[upUid].upSign) {
    return;
  }

  if (blockedParameter.blockedUpSigns_UseRegular) {
    const blockedUpSignsHitItem = blockedParameter.blockedUpSigns_Array.find(
      (blockedUpSignsItem) => {
        const blockedUpSignsRegEx = new RegExp(blockedUpSignsItem);
        if (blockedUpSignsRegEx.test(videoUpInfoDict[upUid].upSign)) {
          return true;
        }
      }
    );

    if (blockedUpSignsHitItem) {
      markAsBlockedTarget(videoBv, "按UP主简介屏蔽", blockedUpSignsHitItem);
    }
  } else {
    const blockedUpSignsHitItem = blockedParameter.blockedUpSigns_Array.find(
      (blockedUpSignsItem) => {
        if (blockedUpSignsItem === videoUpInfoDict[upUid].upSign) {
          return true;
        }
      }
    );

    if (blockedUpSignsHitItem) {
      markAsBlockedTarget(videoBv, "按UP主简介屏蔽", blockedUpSignsHitItem);
    }
  }
}

function getVideoApiTags(videoBv) {
  if (videoInfoDict[videoBv].videoTags) {
    return;
  }

  // 🚀 添加防抖检查 - 防止重复请求
  const requestKey = videoBv + "_tags";
  if (pendingApiRequests[requestKey]) {
    return;
  }
  pendingApiRequests[requestKey] = true;

  const currentTime = new Date();
  if (
    videoInfoDict[videoBv].lastVideoTagApiRequestTime &&
    currentTime - videoInfoDict[videoBv].lastVideoTagApiRequestTime < 3000
  ) {
    delete pendingApiRequests[requestKey];
    return;
  }
  videoInfoDict[videoBv].lastVideoTagApiRequestTime = currentTime;

  fetch(
    `https://api.bilibili.com/x/web-interface/view/detail/tag?bvid=${videoBv}`
  )
    .then((response) => response.json())
    .then((videoApiTagsJson) => {
      videoInfoDict[videoBv].videoTags = videoApiTagsJson.data.map(
        (tagsArray) => tagsArray.tag_name
      );
      // 🚀 请求完成，清除标记
      delete pendingApiRequests[requestKey];
      FuckYouBilibiliRecommendationSystem();
    })
    .catch((error) => {
      consoleLogOutput(videoBv, "getVideoApiTags() Fetch错误:", error);
      // 🚀 请求失败，清除标记
      delete pendingApiRequests[requestKey];
    });
}

function handleBlockedTag(videoBv) {
  if (!videoInfoDict[videoBv].videoTags) {
    consoleLogOutput(videoBv, "没有标签数据，跳过标签检查");
    return;
  }

  consoleLogOutput(videoBv, "视频标签:", videoInfoDict[videoBv].videoTags);
  consoleLogOutput(videoBv, "屏蔽标签列表:", blockedParameter.blockedTag_Array);

  let blockedRulesItemText = "";

  if (blockedParameter.blockedTag_UseRegular) {
    const blockedTagHitItem = blockedParameter.blockedTag_Array.find(
      (blockedTagItem) => {
        try {
          const blockedTagRegEx = new RegExp(blockedTagItem, "i"); // 添加'i'忽略大小写
          const videoTagHitItem = videoInfoDict[videoBv].videoTags.find(
            (videoTagItem) => blockedTagRegEx.test(videoTagItem)
          );

          if (videoTagHitItem) {
            blockedRulesItemText = videoTagHitItem;
            consoleLogOutput(
              videoBv,
              "正则匹配到标签:",
              blockedTagItem,
              "->",
              videoTagHitItem
            );
            return true;
          }
        } catch (error) {
          consoleLogOutput(videoBv, "正则表达式错误:", blockedTagItem, error);
        }
        return false;
      }
    );

    if (blockedTagHitItem) {
      markAsBlockedTarget(videoBv, "按标签屏蔽", blockedRulesItemText);
      consoleLogOutput(videoBv, "已标记为屏蔽目标 - 标签匹配");

      // 🆕 自动触发"不想看此UP主"功能
      autoTriggerBlockUp(videoBv);
    }
  } else {
    const blockedTagHitItem = blockedParameter.blockedTag_Array.find(
      (blockedTagItem) => {
        const videoTagHitItem = videoInfoDict[videoBv].videoTags.find(
          (videoTagItem) =>
            blockedTagItem.trim().toLowerCase() ===
            videoTagItem.trim().toLowerCase()
        );

        if (videoTagHitItem) {
          blockedRulesItemText = videoTagHitItem;
          consoleLogOutput(
            videoBv,
            "精确匹配到标签:",
            blockedTagItem,
            "->",
            videoTagHitItem
          );
          return true;
        }
        return false;
      }
    );

    if (blockedTagHitItem) {
      markAsBlockedTarget(videoBv, "按标签屏蔽", blockedRulesItemText);
      consoleLogOutput(videoBv, "已标记为屏蔽目标 - 标签匹配");

      // 🆕 自动触发"不想看此UP主"功能
      autoTriggerBlockUp(videoBv);
    }
  }
}

function handleDoubleBlockedTag(videoBv) {
  if (!videoInfoDict[videoBv].videoTags) {
    consoleLogOutput(videoBv, "没有标签数据，跳过双重标签检查");
    return;
  }

  consoleLogOutput(
    videoBv,
    "视频标签(双重检查):",
    videoInfoDict[videoBv].videoTags
  );
  consoleLogOutput(
    videoBv,
    "双重屏蔽标签列表:",
    blockedParameter.doubleBlockedTag_Array
  );

  let blockedRulesItemText = "";

  if (blockedParameter.doubleBlockedTag_UseRegular) {
    const doubleBlockedTagHitItem =
      blockedParameter.doubleBlockedTag_Array.find((doubleBlockedTag) => {
        try {
          const doubleBlockedTagSplitArray = doubleBlockedTag.split("|");
          if (doubleBlockedTagSplitArray.length !== 2) {
            consoleLogOutput(videoBv, "双重标签格式错误:", doubleBlockedTag);
            return false;
          }

          const doubleBlockedTagRegEx0 = new RegExp(
            doubleBlockedTagSplitArray[0],
            "i"
          );
          const doubleBlockedTagRegEx1 = new RegExp(
            doubleBlockedTagSplitArray[1],
            "i"
          );

          const videoTagHitItem0 = videoInfoDict[videoBv].videoTags.find(
            (videoTagItem) => doubleBlockedTagRegEx0.test(videoTagItem)
          );
          const videoTagHitItem1 = videoInfoDict[videoBv].videoTags.find(
            (videoTagItem) => doubleBlockedTagRegEx1.test(videoTagItem)
          );

          if (videoTagHitItem0 && videoTagHitItem1) {
            blockedRulesItemText = `${videoTagHitItem0},${videoTagHitItem1}`;
            consoleLogOutput(
              videoBv,
              "双重标签正则匹配:",
              doubleBlockedTag,
              "->",
              blockedRulesItemText
            );
            return true;
          }
        } catch (error) {
          consoleLogOutput(
            videoBv,
            "双重标签正则表达式错误:",
            doubleBlockedTag,
            error
          );
        }
        return false;
      });

    if (doubleBlockedTagHitItem) {
      markAsBlockedTarget(videoBv, "按双重标签屏蔽", blockedRulesItemText);
      consoleLogOutput(videoBv, "已标记为屏蔽目标 - 双重标签匹配");

      // 🆕 自动触发"不想看此UP主"功能
      autoTriggerBlockUp(videoBv);
    }
  } else {
    const doubleBlockedTagHitItem =
      blockedParameter.doubleBlockedTag_Array.find((doubleBlockedTag) => {
        const doubleBlockedTagSplitArray = doubleBlockedTag.split("|");
        if (doubleBlockedTagSplitArray.length !== 2) {
          consoleLogOutput(videoBv, "双重标签格式错误:", doubleBlockedTag);
          return false;
        }

        const videoTagHitItem0 = videoInfoDict[videoBv].videoTags.find(
          (videoTagItem) =>
            doubleBlockedTagSplitArray[0].trim().toLowerCase() ===
            videoTagItem.trim().toLowerCase()
        );
        const videoTagHitItem1 = videoInfoDict[videoBv].videoTags.find(
          (videoTagItem) =>
            doubleBlockedTagSplitArray[1].trim().toLowerCase() ===
            videoTagItem.trim().toLowerCase()
        );

        if (videoTagHitItem0 && videoTagHitItem1) {
          blockedRulesItemText = `${videoTagHitItem0},${videoTagHitItem1}`;
          consoleLogOutput(
            videoBv,
            "双重标签精确匹配:",
            doubleBlockedTag,
            "->",
            blockedRulesItemText
          );
          return true;
        }
        return false;
      });

    if (doubleBlockedTagHitItem) {
      markAsBlockedTarget(videoBv, "按双重标签屏蔽", blockedRulesItemText);
      consoleLogOutput(videoBv, "已标记为屏蔽目标 - 双重标签匹配");

      // 🆕 自动触发"不想看此UP主"功能
      autoTriggerBlockUp(videoBv);
    }
  }
}
let apiRequestDelayTime = 0;
function getVideoApiComments(videoBv) {
  if (
    videoInfoDict[videoBv].filteredComments === false ||
    videoInfoDict[videoBv].filteredComments === true
  ) {
    return;
  }

  // 🚀 添加防抖检查
  const requestKey = videoBv + "_comments";
  if (pendingApiRequests[requestKey]) {
    return;
  }
  pendingApiRequests[requestKey] = true;

  const currentTime = new Date();
  if (
    videoInfoDict[videoBv].lastVideoCommentsApiRequestTime &&
    currentTime - videoInfoDict[videoBv].lastVideoCommentsApiRequestTime < 3000
  ) {
    delete pendingApiRequests[requestKey];
    return;
  }
  let apiRequestDelayTimeData = new Date(apiRequestDelayTime);
  videoInfoDict[videoBv].lastVideoCommentsApiRequestTime = new Date(
    currentTime.getTime() + apiRequestDelayTimeData.getTime()
  );

  // ... 现有的延迟逻辑保持不变 ...

  setTimeout(() => {
    const url = "https://api.bilibili.com/x/v2/reply";
    const params = {
      type: 1,
      oid: videoBv,
      sort: 0,
      ps: 1,
      pn: 1,
      nohot: 0,
    };
    const searchParams = new URLSearchParams(params).toString();

    fetch(`${url}?${searchParams}`)
      .then((response) => response.json())
      .then((VideoApiCommentsJson) => {
        videoInfoDict[videoBv].filteredComments =
          VideoApiCommentsJson.data?.control?.web_selection;

        videoInfoDict[videoBv].topComment =
          VideoApiCommentsJson.data.upper.top?.content?.message;

        // 🚀 请求完成，清除标记
        delete pendingApiRequests[requestKey];
        FuckYouBilibiliRecommendationSystem();
      })
      .catch((error) => {
        consoleLogOutput(videoBv, "getVideoApiComments() Fetch错误:", error);
        // 🚀 请求失败，清除标记
        delete pendingApiRequests[requestKey];
      });
  }, apiRequestDelayTime);

  apiRequestDelayTime = apiRequestDelayTime + 100;
}

function handleBlockedFilteredCommentsVideo(videoBv) {
  if (videoInfoDict[videoBv].filteredComments) {
    markAsBlockedTarget(
      videoBv,
      "屏蔽精选评论的视频",
      videoInfoDict[videoBv].videoUpName
    );
  }
}

function handleBlockedTopComment(videoBv) {
  if (!videoInfoDict[videoBv].topComment) {
    return;
  }

  if (blockedParameter.blockedTopComment_UseRegular) {
    const blockedTopCommentHitItem =
      blockedParameter.blockedTopComment_Array.find((blockedTopComment) => {
        const blockedTitleRegEx = new RegExp(blockedTopComment);
        if (blockedTitleRegEx.test(videoInfoDict[videoBv].topComment)) {
          return true;
        }
      });

    if (blockedTopCommentHitItem) {
      markAsBlockedTarget(videoBv, "按置顶评论屏蔽", blockedTopCommentHitItem);
    }
  } else {
    const blockedTopCommentHitItem =
      blockedParameter.blockedTopComment_Array.find((blockedTopComment) => {
        if (blockedTopComment === videoInfoDict[videoBv].topComment) {
          return true;
        }
      });

    if (blockedTopCommentHitItem) {
      markAsBlockedTarget(videoBv, "按置顶评论屏蔽", blockedTopCommentHitItem);
    }
  }
}

function handleWhitelistNameOrUid(videoBv) {
  if (!videoInfoDict[videoBv].videoUpUid) {
    return;
  }

  const videoNameOrUid = blockedParameter.whitelistNameOrUid_Array.find(
    (whitelistNameOrUidItem) => {
      if (whitelistNameOrUidItem == videoInfoDict[videoBv].videoUpName) {
        return true;
      }

      if (whitelistNameOrUidItem == videoInfoDict[videoBv].videoUpUid) {
        return true;
      }
    }
  );

  if (videoNameOrUid) {
    videoInfoDict[videoBv].whiteListTargets = true;
  }
}

function determineURL(urlRules, currentUrl) {
  return urlRules.some((urlRule) => urlRule.test(currentUrl));
}

function getTrendingItemElements() {
  let trendingItemElements = document.querySelectorAll("div.trending-item");
  return trendingItemElements;
}

function handleBlockedTrendingItemElements(
  trendingItem,
  blockedTrendingItem_Array,
  useRegex
) {
  if (
    trendingItem.style.display === "none" ||
    trendingItem.querySelector(".blockedOverlay")
  ) {
    return;
  }

  if (useRegex) {
    const blockedTrendingHitItem = blockedTrendingItem_Array.find(
      (blockedTrendingItem) => {
        const blockedTrendingItemRegEx = new RegExp(blockedTrendingItem);
        if (blockedTrendingItemRegEx.test(trendingItem.textContent)) {
          return true;
        }
      }
    );

    if (blockedTrendingHitItem) {
      addTrendingItemHiddenOrOverlay(trendingItem, blockedTrendingHitItem);
    }
  } else {
    const blockedTrendingHitItem = blockedTrendingItem_Array.find(
      (blockedTrendingItem) => {
        if (blockedTrendingItem === trendingItem.textContent) {
          return true;
        }
      }
    );

    if (blockedTrendingHitItem) {
      addTrendingItemHiddenOrOverlay(trendingItem, blockedTrendingHitItem);
    }
  }
}

function addTrendingItemHiddenOrOverlay(trendingItem, blockedRulesText) {
  if (blockedParameter.hideVideoMode_Switch == true) {
    trendingItem.style.display = "none";
  } else {
    const elementRect = trendingItem.getBoundingClientRect();

    let overlay = document.createElement("div");
    overlay.className = "blockedOverlay";
    overlay.style.position = "absolute";
    overlay.style.width = elementRect.width + "px";
    overlay.style.height = elementRect.height + "px";
    overlay.style.transform = "translateX(-16px)";
    overlay.style.backgroundColor = "rgba(60, 60, 60, 0.85)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "10";
    overlay.style.backdropFilter = "blur(6px)";
    overlay.style.borderRadius = "6px";

    let overlayText = document.createElement("div");
    overlayText.innerText = blockedRulesText;
    overlayText.style.color = "rgb(250,250,250)";
    overlay.appendChild(overlayText);

    // --- 插入：撤回（临时移除 overlay）按钮 --- //
let undoBtn = document.createElement("button");
undoBtn.className = "blockedOverlay-undo-btn";
undoBtn.innerText = "撤销";
undoBtn.title = "临时显示此视频（移除覆盖层）";
undoBtn.style.position = "absolute";
undoBtn.style.top = "6px";
undoBtn.style.right = "6px";
undoBtn.style.zIndex = "9999";
undoBtn.style.padding = "4px 8px";
undoBtn.style.fontSize = "12px";
undoBtn.style.background = "rgba(0,0,0,0.6)";
undoBtn.style.color = "#fff";
undoBtn.style.border = "none";
undoBtn.style.borderRadius = "4px";
undoBtn.style.cursor = "pointer";
undoBtn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
undoBtn.addEventListener("click", (ev) => {
  ev.stopPropagation();
  // 移除 overlay：恢复卡片可见（这不会改动你的 blockedParameter）
  overlay.remove();
});
overlay.appendChild(undoBtn);
// --- end 插入 --- //

    trendingItem.insertAdjacentElement("afterbegin", overlay);
  }
}

function hideNonVideoElements() {
  if (window.location.href.startsWith("https://www.bilibili.com/")) {
    document
      .querySelectorAll(
        `
            div.floor-single-card,
            div.feed-card:has(a[href^="//cm.bilibili.com/"]),
            div.bili-feed-card:has(a[href^="//cm.bilibili.com/"]),
            div.bili-feed-card:has(a[href^="https://live.bilibili.com/"])
            `
      )
      .forEach((el) => el.classList.add("hideAD"));
  }

  if (window.location.href.startsWith("https://search.bilibili.com/all")) {
    document
      .querySelectorAll(
        `
            div.bili-video-card:has(a[href^="https://www.bilibili.com/cheese/"]),
            div.bili-video-card:has(a[href^="//cm.bilibili.com/"]),
            div.bili-video-card:has(a[href^="//live.bilibili.com/"])
            `
      )
      .forEach((el) => el.parentNode.classList.add("hideAD"));
  }

  if (window.location.href.startsWith("https://www.bilibili.com/video/")) {
    document
      .querySelectorAll(
        `
            div#slide_ad,
            .ad-report,
            div.video-page-game-card-small,
            div.video-page-special-card-small,
            div.video-page-operator-card-small,
            div.pop-live-small-mode,
            div.activity-m-v1,
            div.video-card-ad-small
            `
      )
      .forEach((el) => el.classList.add("hideAD"));
  }
}

function blockedOrUnblocked(videoElement, videoBv, setTimeoutStatu = false) {
  if (
    videoInfoDict[videoBv].whiteListTargets &&
    videoInfoDict[videoBv].blockedTarget &&
    videoElement.style.display != "none" &&
    videoElement.firstElementChild.className != "blockedOverlay"
  ) {
    return;
  }

  if (
    videoInfoDict[videoBv].whiteListTargets &&
    videoInfoDict[videoBv].blockedTarget &&
    (videoElement.style.display == "none" ||
      videoElement.firstElementChild.className == "blockedOverlay")
  ) {
    removeHiddenOrOverlay(videoElement, videoBv, setTimeoutStatu);
    return;
  }

  if (
    videoInfoDict[videoBv].whiteListTargets != true &&
    videoInfoDict[videoBv].blockedTarget &&
    (videoElement.style.display == "none" ||
      videoElement.firstElementChild.className == "blockedOverlay")
  ) {
    return;
  }

  if (
    videoInfoDict[videoBv].whiteListTargets != true &&
    videoInfoDict[videoBv].blockedTarget &&
    videoElement.style.display != "none" &&
    videoElement.firstElementChild.className != "blockedOverlay"
  ) {
    addHiddenOrOverlay(videoElement, videoBv, setTimeoutStatu);
    return;
  }

  function addHiddenOrOverlay(videoElement, videoBv, setTimeoutStatu) {
    if (blockedParameter.hideVideoMode_Switch == true) {
      const possibleParents = [
        videoElement.closest("div.feed-card"),
        videoElement.closest("div.bili-feed-card"),
        videoElement.parentNode,
      ];

      for (const parent of possibleParents) {
        if (parent && parent !== document) {
          parent.style.display = "none";
          break;
        }
      }

      videoElement.style.display = "none";
    } else {
      if (
        videoElement.firstElementChild.className == "card-box" &&
        setTimeoutStatu == false
      ) {
        videoElement.style.filter = "blur(5px)";
        setTimeout(() => {
          blockedOrUnblocked(videoElement, videoBv, true);
          videoElement.style.filter = "none";
        }, 3000);

        return;
      }

      const elementRect = videoElement.getBoundingClientRect();

      let overlay = document.createElement("div");
      overlay.className = "blockedOverlay";
      overlay.style.position = "absolute";
      overlay.style.width = elementRect.width + "px";
      overlay.style.height = elementRect.height + "px";
      overlay.style.backgroundColor = "rgba(60, 60, 60, 0.85)";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.zIndex = "10";
      overlay.style.backdropFilter = "blur(6px)";
      overlay.style.borderRadius = "6px";

      let overlayText = document.createElement("div");
      if (videoElement.firstElementChild.className == "card-box") {
        overlayText.style.fontSize = "1.25em";
      }
      overlayText.innerText = videoInfoDict[videoBv].triggeredBlockedRules[0];
      overlayText.style.color = "rgb(250,250,250)";
      overlay.appendChild(overlayText);

        // --- 插入：撤回（临时移除 overlay）按钮 --- //
let undoBtn = document.createElement("button");
undoBtn.className = "blockedOverlay-undo-btn";
undoBtn.innerText = "撤销";
undoBtn.title = "临时显示此视频（移除覆盖层）";
undoBtn.style.position = "absolute";
undoBtn.style.top = "6px";
undoBtn.style.right = "6px";
undoBtn.style.zIndex = "9999";
undoBtn.style.padding = "4px 8px";
undoBtn.style.fontSize = "12px";
undoBtn.style.background = "rgba(0,0,0,0.6)";
undoBtn.style.color = "#fff";
undoBtn.style.border = "none";
undoBtn.style.borderRadius = "4px";
undoBtn.style.cursor = "pointer";
undoBtn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
undoBtn.addEventListener("click", (ev) => {
  ev.stopPropagation();
  // 移除 overlay：恢复卡片可见（这不会改动你的 blockedParameter）
  overlay.remove();
});
overlay.appendChild(undoBtn);
// --- end 插入 --- //


      videoElement.insertAdjacentElement("afterbegin", overlay);
    }
  }

  function removeHiddenOrOverlay(videoElement) {
    if (blockedParameter.hideVideoMode_Switch == true) {
      if (window.location.href.startsWith("https://search.bilibili.com/")) {
        videoElement.parentNode.style.display = "";
        videoElement.style.display = "";
      }

      const divFeedCard = videoElement.closest("div.feed-card");
      if (divFeedCard !== null) {
        divFeedCard.style.display = "";
        videoElement.style.display = "";
        return;
      }

      const divBiliFeedCard = videoElement.closest("div.bili-feed-card");
      if (divBiliFeedCard !== null) {
        divBiliFeedCard.style.display = "";
        videoElement.style.display = "";
        return;
      }

      videoElement.style.display = "";
    } else {
      if (videoElement.firstElementChild.className == "blockedOverlay") {
        videoElement.removeChild(videoElement.firstElementChild);
      }
    }
  }
}

function syncBlockedOverlayAndParentNodeRect() {
  const blockedOverlays = document.querySelectorAll("div.blockedOverlay");

  blockedOverlays.forEach(function (element) {
    const parentNodeElementRect = element.parentNode.getBoundingClientRect();
    element.style.width = parentNodeElementRect.width + "px";
    element.style.height = parentNodeElementRect.height + "px";
  });
}

function FuckYouBilibiliRecommendationSystem() {
  if (blockedParameter.hideNonVideoElements_Switch) {
    hideNonVideoElements();
  }

  if (objectDifferent(lastConsoleVideoInfoDict, videoInfoDict)) {
    consoleLogOutput(
      Object.keys(videoInfoDict).length,
      "个视频信息: ",
      videoInfoDict
    );

    lastConsoleVideoInfoDict = Object.assign({}, videoInfoDict);
  }

  if (blockedParameter.hideTrending_Switch) {
    const trendingModuleElements = document.querySelectorAll("div.trending");
    trendingModuleElements.forEach((element) => {
      element.style.display = "none";
    });
  }

  const trendingItemElements = getTrendingItemElements();

  trendingItemElements.forEach((trendingItemElement) => {
    if (blockedParameter.blockedTrendingItem_Switch) {
      handleBlockedTrendingItemElements(
        trendingItemElement,
        blockedParameter.blockedTrendingItem_Array,
        blockedParameter.blockedTrendingItem_UseRegular
      );
    }

    if (blockedParameter.blockedTrendingItemByTitleTag_Switch) {
      handleBlockedTrendingItemElements(
        trendingItemElement,
        blockedParameter.blockedTitle_Array,
        blockedParameter.blockedTitle_UseRegular
      );
    }
  });

  if (determineURL(noBlockedVideoUrls, window.location.href)) {
    return;
  }

  const videoElements = getVideoElements();

  for (let videoElement of videoElements) {
    if (isAlreadyBlockedChildElement(videoElement)) {
      continue;
    }

    let videoBv = getBvAndTitle(videoElement);

    if (!videoBv) {
      continue;
    }

    // 🚀 优化1: 白名单优先检查
    if (
      blockedParameter.whitelistNameOrUid_Switch &&
      blockedParameter.whitelistNameOrUid_Array.length > 0
    ) {
      handleWhitelistNameOrUid(videoBv);
      if (videoInfoDict[videoBv].whiteListTargets) {
        // 白名单视频，跳过所有后续检查
        continue;
      }
    }

    // 🚀 优化2: 重新排列检查顺序
    const checks = [
      // 快速检查（无需API）
      () =>
        blockedParameter.blockedTitle_Switch &&
        blockedParameter.blockedTitle_Array.length > 0 &&
        handleBlockedTitle(videoBv),

      () =>
        blockedParameter.blockedNameOrUid_Switch &&
        blockedParameter.blockedNameOrUid_Array.length > 0 &&
        handleBlockedNameOrUid(videoBv),

      // 需要基础API数据的检查
      () => {
        if (
          (blockedParameter.blockedTag_Switch &&
            blockedParameter.blockedTag_Array.length > 0) ||
          (blockedParameter.doubleBlockedTag_Switch &&
            blockedParameter.doubleBlockedTag_Array.length > 0)
        ) {
          getVideoApiTags(videoBv);
          if (videoInfoDict[videoBv].videoTags) {
            if (
              blockedParameter.blockedTag_Switch &&
              blockedParameter.blockedTag_Array.length > 0
            ) {
              handleBlockedTag(videoBv);
            }
            if (
              blockedParameter.doubleBlockedTag_Switch &&
              blockedParameter.doubleBlockedTag_Array.length > 0
            ) {
              handleDoubleBlockedTag(videoBv);
            }
          }
        }
      },

      // 其他需要API的检查
      () => {
        getVideoApiInfo(videoBv);
        if (videoInfoDict[videoBv].videoDuration) {
          if (
            blockedParameter.blockedShortDuration_Switch &&
            blockedParameter.blockedShortDuration > 0
          ) {
            handleBlockedShortDuration(videoBv);
          }
          if (
            blockedParameter.blockedBelowVideoViews_Switch &&
            blockedParameter.blockedBelowVideoViews > 0
          ) {
            handleBlockedBelowVideoViews(videoBv);
          }
          if (blockedParameter.blockedChargingExclusive_Switch) {
            handleBlockedChargingExclusive(videoBv);
          }
          if (
            blockedParameter.blockedAboveFavoriteCoinRatio_Switch &&
            blockedParameter.blockedAboveFavoriteCoinRatio > 0
          ) {
            handleBlockedAboveFavoriteCoinRatio(videoBv);
          }
          if (blockedParameter.blockedPortraitVideo_Switch) {
            handleBlockedPortraitVideo(videoBv);
          }
          if (
            blockedParameter.blockedVideoPartitions_Switch &&
            blockedParameter.blockedVideoPartitions_Array.length > 0
          ) {
            handleBlockedVideoPartitions(videoBv);
          }
          if (
            blockedParameter.blockedBelowVideoQualityScore_Switch &&
            blockedParameter.blockedBelowVideoQualityScore > 0
          ) {
            handleBlockedBelowVideoQualityScore(videoBv);
          }
        }
      },

      // UP主相关检查
      () => {
        if (
          (blockedParameter.blockedBelowUpLevel_Switch &&
            blockedParameter.blockedBelowUpLevel > 0) ||
          (blockedParameter.blockedBelowUpFans_Switch &&
            blockedParameter.blockedBelowUpFans > 0) ||
          (blockedParameter.blockedUpSigns_Switch &&
            blockedParameter.blockedUpSigns_Array.length > 0)
        ) {
          getVideoApiUpInfo(videoBv);
          if (videoInfoDict[videoBv].videoUpLevel !== undefined) {
            if (
              blockedParameter.blockedBelowUpLevel_Switch &&
              blockedParameter.blockedBelowUpLevel > 0
            ) {
              handleBlockedBelowUpLevel(videoBv);
            }
            if (
              blockedParameter.blockedBelowUpFans_Switch &&
              blockedParameter.blockedBelowUpFans > 0
            ) {
              handleBlockedBelowUpFans(videoBv);
            }
            // 是否启用 屏蔽高于指定UP主关注数的视频
            if (
              blockedParameter.blockedAboveUpAttention_Switch &&
              blockedParameter.blockedAboveUpAttention > 0
            ) {
              // 判断处理匹配的高于指定UP主关注数的视频
              handleBlockedBelowUpAttention(videoBv);
            }
            // 是否启用 屏蔽包含相关UP主简介的视频
            if (
              blockedParameter.blockedUpSigns_Switch &&
              blockedParameter.blockedUpSigns_Array.length > 0
            ) {
              // 判断处理匹配的包含相关UP主简介的视频
              handleBlockedUpSigns(videoBv);
            }
          }
        }
      },

      // 评论相关检查
      () => {
        if (
          blockedParameter.blockedFilteredCommentsVideo_Switch ||
          (blockedParameter.blockedTopComment_Switch &&
            blockedParameter.blockedTopComment_Array.length > 0)
        ) {
          getVideoApiComments(videoBv);
          if (videoInfoDict[videoBv].filteredComments !== undefined) {
            if (blockedParameter.blockedFilteredCommentsVideo_Switch) {
              handleBlockedFilteredCommentsVideo(videoBv);
            }
            if (
              blockedParameter.blockedTopComment_Switch &&
              blockedParameter.blockedTopComment_Array.length > 0
            ) {
              handleBlockedTopComment(videoBv);
            }
          }
        }
      },
    ];

    // 按顺序执行检查，如果视频已被屏蔽就提前退出
    for (const check of checks) {
      if (videoInfoDict[videoBv].blockedTarget) break;
      check();
    }

    getNameAndUid(videoElement, videoBv);
    blockedOrUnblocked(videoElement, videoBv);
    syncBlockedOverlayAndParentNodeRect();
  }
}

window.addEventListener("load", FuckYouBilibiliRecommendationSystem);

window.addEventListener("resize", FuckYouBilibiliRecommendationSystem);

let mutationTimeout;
function debouncedMutationCallback() {
  clearTimeout(mutationTimeout);
  mutationTimeout = setTimeout(() => {
    FuckYouBilibiliRecommendationSystem();
  }, 500); // 500ms防抖，避免频繁触发
}

let observer = new MutationObserver(debouncedMutationCallback);
let targetNode = document.body;
let config = { childList: true, subtree: true };
observer.observe(targetNode, config);

(function () {
  const btn = document.createElement("button");
  btn.textContent = "脚本配置";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = "999999";
  btn.style.padding = "8px 12px";
  btn.style.background = "#0094CA";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.cursor = "pointer";

  btn.addEventListener("click", () => {
    const menuElement = document.getElementById("blockedMenuUi");

    if (menuElement) {
      menuElement.remove();
    } else {
      blockedMenuUi();
    }
  });

  document.body.appendChild(btn);

// 更通用的卡片选择器，覆盖 首页 / 搜索 / 排行 / 分区 / 小卡片等
   const SELECTOR = [
  "div.bili-video-card",             // 首页、部分频道
  "li.bili-rank-list-video__item",   // 排行榜项
  ".video-item",                     // 搜索页常见的视频项
  "div.video-card",                  // 通用视频卡片
  "div.video-page-card-small",       // 小卡片
  "div.video-card-reco",             // 推荐类卡片
  "div.video-card-common",           // 其他场景
  "li.rank-item",                    // 另一种排行项
  "div.rank-wrap"                    // 备选
].join(",");
  const tagsCache = {};

  function av2bv(aid) {
    const XOR_CODE = 23442827791579n;
    const MASK_CODE = 2251799813685247n;
    const MAX_AID = 1n << 51n;
    const BASE = 58n;
    const data = "FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf";
    const bytes = ["B", "V", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
    let bvIndex = bytes.length - 1;
    let tmp = (MAX_AID | BigInt(aid)) ^ XOR_CODE;
    while (tmp > 0) {
      bytes[bvIndex] = data[Number(tmp % BigInt(BASE))];
      tmp = tmp / BASE;
      bvIndex -= 1;
    }
    [bytes[3], bytes[9]] = [bytes[9], bytes[3]];
    [bytes[4], bytes[7]] = [bytes[7], bytes[4]];
    return bytes.join("");
  }

  function extractBv(card) {
    const a = card.querySelector("a.bili-video-card__image--link");
    if (!a) return null;
    const href = a.href || "";
    const bvMatch = href.match(/\/(BV[0-9A-Za-z]+)/);
    if (bvMatch) return bvMatch[1];
    const avMatch = href.match(/\/(av)(\d+)/i);
    if (avMatch) return av2bv(avMatch[2]);
    return null;
  }

  async function fetchTags(bv) {
    if (!bv) return "";
    if (tagsCache[bv]) return tagsCache[bv];
    try {
      const resp = await fetch(
        `https://api.bilibili.com/x/web-interface/view/detail/tag?bvid=${bv}`,
        { credentials: "omit" }
      );
      const j = await resp.json();
      let tags = "";
      if (j && Array.isArray(j.data)) {
        tags = j.data
          .map((t) => t.tag_name.replace(/\s+/g, ""))
          .filter(Boolean)
          .join(",");
      } else if (j && j.data && Array.isArray(j.data.tags)) {
        tags = j.data.tags
          .map((t) => t.tag_name || t)
          .filter(Boolean)
          .join(",");
      }
      tagsCache[bv] = tags;
      return tags;
    } catch (e) {
      tagsCache[bv] = "";
      return "";
    }
  }

  function showTempText(btn, msg, timeout = 1400) {
    const old = btn.innerText;
    btn.innerText = msg;
    setTimeout(() => {
      btn.innerText = old;
    }, timeout);
  }

  // 快速标签\作者\分区提取屏蔽
  // 快速标签\作者\分区提取屏蔽
  function showTagSelectionUI(tags, bv) {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.zIndex = "999900";
    modal.style.background = "#2a2a2a";
    modal.style.padding = "20px";
    modal.style.borderRadius = "8px";
    modal.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    modal.style.maxWidth = "80%";
    modal.style.maxHeight = "80%";
    modal.style.overflow = "auto";
    modal.style.color = "#fff";

      // —— 显示视频标题 ——
      const realTitle = videoInfoDict[bv]?.videoTitle || "(未知标题)";
      const displayTitle = document.createElement("div");
      displayTitle.textContent = `标题：${realTitle}`;
      displayTitle.style.cssText = `
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 12px;
    color: #fff;
`;
      modal.appendChild(displayTitle);

    const title = document.createElement("h3");
    title.textContent = `选择要屏蔽的内容 (BV: ${bv})`;
    title.style.margin = "0 0 15px 0";
    modal.appendChild(title);

    // 获取视频分区信息
    let videoPartition = "";
    if (videoInfoDict[bv] && videoInfoDict[bv].videoPartitions) {
      videoPartition = videoInfoDict[bv].videoPartitions;
    }

    // 获取UP主信息
    let upUid = "";
    let upName = "";
    if (videoInfoDict[bv] && videoInfoDict[bv].videoUpUid) {
      upUid = videoInfoDict[bv].videoUpUid;
      upName = videoInfoDict[bv].videoUpName || "未知UP主";
    }

    // 🆕 添加内容不感兴趣和UP主不感兴趣选项
    const interestSection = document.createElement("div");
    interestSection.style.marginBottom = "20px";
    interestSection.style.padding = "15px";
    interestSection.style.background = "#333";
    interestSection.style.borderRadius = "6px";

    const interestTitle = document.createElement("h4");
    interestTitle.textContent = "内容反馈";
    interestTitle.style.margin = "0 0 12px 0";
    interestTitle.style.color = "#ccc";
    interestSection.appendChild(interestTitle);

    const interestButtonsContainer = document.createElement("div");
    interestButtonsContainer.style.display = "flex";
    interestButtonsContainer.style.gap = "10px";
    interestButtonsContainer.style.flexWrap = "wrap";

    // 内容不感兴趣按钮
    const notInterestedBtn = document.createElement("button");
    notInterestedBtn.innerHTML =
      '<span style="margin-right: 5px;">👎</span>内容不感兴趣';
    notInterestedBtn.style.padding = "10px 16px";
    notInterestedBtn.style.background = "#555";
    notInterestedBtn.style.color = "#fff";
    notInterestedBtn.style.border = "none";
    notInterestedBtn.style.borderRadius = "6px";
    notInterestedBtn.style.cursor = "pointer";
    notInterestedBtn.style.transition = "all 0.2s ease";
    notInterestedBtn.style.fontSize = "14px";
    notInterestedBtn.style.display = "flex";
    notInterestedBtn.style.alignItems = "center";

    notInterestedBtn.addEventListener("mouseover", () => {
      notInterestedBtn.style.background = "#666";
    });
    notInterestedBtn.addEventListener("mouseout", () => {
      notInterestedBtn.style.background = "#555";
    });

    notInterestedBtn.addEventListener("click", () => {
      triggerNotInterestedEvent(modal, {
        bv: bv,
        upUid: upUid,
        upName: upName,
        title: videoInfoDict[bv]?.videoTitle || "",
        _vts: Date.now(),
      });


      notInterestedBtn.innerHTML =
        '<span style="margin-right: 5px;">✅</span>已反馈';
      notInterestedBtn.style.background = "#4caf50";
      notInterestedBtn.disabled = true;

      setTimeout(() => {
        notInterestedBtn.innerHTML =
          '<span style="margin-right: 5px;">👎</span>内容不感兴趣';
        notInterestedBtn.style.background = "#555";
        notInterestedBtn.disabled = false;
      }, 1500);
    });

    // 不想看此UP主按钮
    const blockUpBtn = document.createElement("button");
    blockUpBtn.innerHTML =
      '<span style="margin-right: 5px;">🚫</span>不想看此UP主';
    blockUpBtn.style.padding = "10px 16px";
    blockUpBtn.style.background = "#555";
    blockUpBtn.style.color = "#fff";
    blockUpBtn.style.border = "none";
    blockUpBtn.style.borderRadius = "6px";
    blockUpBtn.style.cursor = "pointer";
    blockUpBtn.style.transition = "all 0.2s ease";
    blockUpBtn.style.fontSize = "14px";
    blockUpBtn.style.display = "flex";
    blockUpBtn.style.alignItems = "center";

    blockUpBtn.addEventListener("mouseover", () => {
      blockUpBtn.style.background = "#666";
    });
    blockUpBtn.addEventListener("mouseout", () => {
      blockUpBtn.style.background = "#555";
    });

    blockUpBtn.addEventListener("click", () => {
      triggerBlockUpEvent(modal, {
        bv: bv,
        upUid: upUid,
        upName: upName,
        _vts: Date.now(),
      });

      blockUpBtn.innerHTML =
        '<span style="margin-right: 5px;">✅</span>已屏蔽UP主';
      blockUpBtn.style.background = "#4caf50";
      blockUpBtn.disabled = true;

      setTimeout(() => {
        blockUpBtn.innerHTML =
          '<span style="margin-right: 5px;">🚫</span>不想看此UP主';
        blockUpBtn.style.background = "#555";
        blockUpBtn.disabled = false;
      }, 1500);
    });

    interestButtonsContainer.appendChild(notInterestedBtn);
    interestButtonsContainer.appendChild(blockUpBtn);
    interestSection.appendChild(interestButtonsContainer);
    modal.appendChild(interestSection);

    // 原有的UP主屏蔽部分
    if (upUid) {
      const upSection = document.createElement("div");
      upSection.style.marginBottom = "20px";

      const upTitle = document.createElement("h4");
      upTitle.textContent = "UP主屏蔽";
      upTitle.style.margin = "0 0 10px 0";
      upTitle.style.color = "#ccc";
      upSection.appendChild(upTitle);

      const upInfoContainer = document.createElement("div");
      upInfoContainer.style.display = "flex";
      upInfoContainer.style.flexDirection = "column";
      upInfoContainer.style.gap = "8px";

      // UP主名称和UID显示
      const upInfoText = document.createElement("div");
      upInfoText.textContent = `${upName} (UID: ${upUid})`;
      upInfoText.style.fontSize = "14px";
      upInfoText.style.color = "#ddd";
      upInfoText.style.marginBottom = "8px";
      upInfoContainer.appendChild(upInfoText);

      // UP主屏蔽按钮
      const upBlockBtn = document.createElement("button");
      upBlockBtn.textContent = "屏蔽此UP主";
      upBlockBtn.style.padding = "8px 16px";
      upBlockBtn.style.border = "none";
      upBlockBtn.style.borderRadius = "4px";
      upBlockBtn.style.cursor = "pointer";
      upBlockBtn.style.transition = "all 0.2s ease";
      upBlockBtn.style.fontSize = "14px";
      upBlockBtn.style.width = "fit-content";

      // 检查是否已经在UP主屏蔽列表中
      const isUpBlocked = blockedParameter.blockedNameOrUid_Array.some(
        (blockedItem) => blockedItem === upUid || blockedItem === upName
      );

      if (isUpBlocked) {
        upBlockBtn.style.background = "#4caf50";
        upBlockBtn.style.color = "#fff";
        upBlockBtn.title = "点击从UP主屏蔽列表中移除";
        upBlockBtn.textContent = "✓ 已屏蔽此UP主";
      } else {
        upBlockBtn.style.background = "#3a3a3a";
        upBlockBtn.style.color = "#fff";
        upBlockBtn.title = "点击屏蔽此UP主";
        upBlockBtn.textContent = "屏蔽此UP主";
      }

      upBlockBtn.addEventListener("click", () => {
        const uidIndex = blockedParameter.blockedNameOrUid_Array.findIndex(
          (blockedItem) => blockedItem === upUid
        );
        const nameIndex = blockedParameter.blockedNameOrUid_Array.findIndex(
          (blockedItem) => blockedItem === upName
        );

        if (uidIndex === -1 && nameIndex === -1) {
          // 添加到屏蔽列表（优先使用UID）
          blockedParameter.blockedNameOrUid_Array.push(upUid);
          upBlockBtn.style.background = "#4caf50";
          upBlockBtn.title = "点击从UP主屏蔽列表中移除";
          upBlockBtn.textContent = "✓ 已屏蔽此UP主";

          const tempText = upBlockBtn.textContent;
          setTimeout(() => {
            upBlockBtn.textContent = tempText;
          }, 1000);
        } else {
          // 从屏蔽列表中移除
          if (uidIndex !== -1) {
            blockedParameter.blockedNameOrUid_Array.splice(uidIndex, 1);
          }
          if (nameIndex !== -1) {
            blockedParameter.blockedNameOrUid_Array.splice(nameIndex, 1);
          }
          upBlockBtn.style.background = "#3a3a3a";
          upBlockBtn.title = "点击屏蔽此UP主";
          upBlockBtn.textContent = "屏蔽此UP主";

          const tempText = upBlockBtn.textContent;
          setTimeout(() => {
            upBlockBtn.textContent = tempText;
          }, 1000);
        }

        GM_setValue("GM_blockedParameter", blockedParameter);
        FuckYouBilibiliRecommendationSystem();
      });

      upInfoContainer.appendChild(upBlockBtn);
      upSection.appendChild(upInfoContainer);
      modal.appendChild(upSection);
    }

    // 🆕 添加分区选择部分
    if (videoPartition) {
      const partitionSection = document.createElement("div");
      partitionSection.style.marginBottom = "20px";

      const partitionTitle = document.createElement("h4");
      partitionTitle.textContent = "视频分区";
      partitionTitle.style.margin = "0 0 10px 0";
      partitionTitle.style.color = "#ccc";
      partitionSection.appendChild(partitionTitle);

      const partitionBtn = document.createElement("button");
      partitionBtn.textContent = videoPartition;
      partitionBtn.style.padding = "8px 16px";
      partitionBtn.style.border = "none";
      partitionBtn.style.borderRadius = "4px";
      partitionBtn.style.cursor = "pointer";
      partitionBtn.style.transition = "all 0.2s ease";
      partitionBtn.style.fontSize = "14px";

      // 检查是否已经在分区屏蔽列表中
      const isPartitionBlocked =
        blockedParameter.blockedVideoPartitions_Array.some(
          (blockedPartition) =>
            blockedPartition.trim().toLowerCase() ===
            videoPartition.trim().toLowerCase()
        );

      if (isPartitionBlocked) {
        partitionBtn.style.background = "#4caf50";
        partitionBtn.style.color = "#fff";
        partitionBtn.title = "点击从分区屏蔽列表中移除";
      } else {
        partitionBtn.style.background = "#3a3a3a";
        partitionBtn.style.color = "#fff";
        partitionBtn.title = "点击添加到分区屏蔽列表";
      }

      partitionBtn.addEventListener("click", () => {
        const index = blockedParameter.blockedVideoPartitions_Array.findIndex(
          (blockedPartition) =>
            blockedPartition.trim().toLowerCase() ===
            videoPartition.trim().toLowerCase()
        );

        if (index === -1) {
          blockedParameter.blockedVideoPartitions_Array.push(videoPartition);
          partitionBtn.style.background = "#4caf50";
          partitionBtn.title = "点击从分区屏蔽列表中移除";

          const tempText = partitionBtn.textContent;
          partitionBtn.textContent = "✓ 已添加";
          setTimeout(() => {
            partitionBtn.textContent = tempText;
          }, 1000);
        } else {
          blockedParameter.blockedVideoPartitions_Array.splice(index, 1);
          partitionBtn.style.background = "#3a3a3a";
          partitionBtn.title = "点击添加到分区屏蔽列表";

          const tempText = partitionBtn.textContent;
          partitionBtn.textContent = "✗ 已移除";
          setTimeout(() => {
            partitionBtn.textContent = tempText;
          }, 1000);
        }

        GM_setValue("GM_blockedParameter", blockedParameter);
        FuckYouBilibiliRecommendationSystem();
      });

      partitionSection.appendChild(partitionBtn);
      modal.appendChild(partitionSection);
    }

    // 🆕 添加标签部分
    if (tags && tags.length > 0) {
      const tagsSection = document.createElement("div");
      tagsSection.style.marginBottom = "20px";

      const tagsTitle = document.createElement("h4");
      tagsTitle.textContent = "视频标签";
      tagsTitle.style.margin = "0 0 10px 0";
      tagsTitle.style.color = "#ccc";
      tagsSection.appendChild(tagsTitle);

      const tagsDescription = document.createElement("p");
      tagsDescription.textContent =
        "绿色背景表示已添加到屏蔽列表，点击可移除；灰色背景表示未添加，点击可添加";
      tagsDescription.style.margin = "0 0 15px 0";
      tagsDescription.style.fontSize = "14px";
      tagsDescription.style.color = "#ccc";
      tagsSection.appendChild(tagsDescription);

      const tagsContainer = document.createElement("div");
      tagsContainer.style.display = "flex";
      tagsContainer.style.flexWrap = "wrap";
      tagsContainer.style.gap = "8px";
      tagsContainer.style.marginBottom = "15px";

      tags.forEach((tag) => {
        if (!tag) return;

        const tagBtn = document.createElement("button");
        tagBtn.textContent = tag;
        tagBtn.style.padding = "6px 12px";
        tagBtn.style.border = "none";
        tagBtn.style.borderRadius = "4px";
        tagBtn.style.cursor = "pointer";
        tagBtn.style.transition = "all 0.2s ease";

        if (!blockedParameter.blockedTag_Array) {
          blockedParameter.blockedTag_Array = [];
        }

        const isAlreadyBlocked = blockedParameter.blockedTag_Array.some(
          (blockedTag) =>
            blockedTag.trim().toLowerCase() === tag.trim().toLowerCase()
        );

        if (isAlreadyBlocked) {
          tagBtn.style.background = "#4caf50";
          tagBtn.style.color = "#fff";
          tagBtn.title = "点击从屏蔽列表中移除";
        } else {
          tagBtn.style.background = "#3a3a3a";
          tagBtn.style.color = "#fff";
          tagBtn.title = "点击添加到屏蔽列表";
        }

        tagBtn.addEventListener("click", () => {
          const index = blockedParameter.blockedTag_Array.findIndex(
            (blockedTag) =>
              blockedTag.trim().toLowerCase() === tag.trim().toLowerCase()
          );

          if (index === -1) {
            blockedParameter.blockedTag_Array.push(tag);
            tagBtn.style.background = "#4caf50";
            tagBtn.title = "点击从屏蔽列表中移除";

            const tempText = tagBtn.textContent;
            tagBtn.textContent = "✓ 已添加";
            setTimeout(() => {
              tagBtn.textContent = tempText;
            }, 1000);
          } else {
            blockedParameter.blockedTag_Array.splice(index, 1);
            tagBtn.style.background = "#3a3a3a";
            tagBtn.title = "点击添加到屏蔽列表";

            const tempText = tagBtn.textContent;
            tagBtn.textContent = "✗ 已移除";
            setTimeout(() => {
              tagBtn.textContent = tempText;
            }, 1000);
          }

          GM_setValue("GM_blockedParameter", blockedParameter);
          FuckYouBilibiliRecommendationSystem();
        });

        tagsContainer.appendChild(tagBtn);
      });

      // 添加一键全部添加按钮
      const addAllBtn = document.createElement("button");
      addAllBtn.textContent = "一键全部添加标签";
      addAllBtn.style.padding = "8px 16px";
      addAllBtn.style.background = "#558EFF";
      addAllBtn.style.color = "#fff";
      addAllBtn.style.border = "none";
      addAllBtn.style.borderRadius = "4px";
      addAllBtn.style.cursor = "pointer";
      addAllBtn.style.marginTop = "10px";

      addAllBtn.addEventListener("click", () => {
        tags.forEach((tag) => {
          if (!tag || blockedParameter.blockedTag_Array.includes(tag)) return;
          blockedParameter.blockedTag_Array.push(tag);
        });

        // 更新所有标签按钮状态
        tagsContainer.querySelectorAll("button").forEach((btn) => {
          btn.style.background = "#4caf50";
          btn.title = "点击从屏蔽列表中移除";
        });

        GM_setValue("GM_blockedParameter", blockedParameter);
        FuckYouBilibiliRecommendationSystem();

        addAllBtn.textContent = "✓ 已全部添加";
        setTimeout(() => {
          addAllBtn.textContent = "一键全部添加标签";
        }, 1000);
      });

      tagsSection.appendChild(tagsContainer);
      tagsSection.appendChild(addAllBtn);
      modal.appendChild(tagsSection);
    }

    // 关闭按钮部分
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.justifyContent = "flex-end";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "关闭";
    closeBtn.style.padding = "8px 16px";
    closeBtn.style.background = "#666";
    closeBtn.style.color = "#fff";
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "4px";
    closeBtn.style.cursor = "pointer";

    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modal);
      document.body.removeChild(overlay);
    });

    buttonContainer.appendChild(closeBtn);
    modal.appendChild(buttonContainer);

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.7)";
    overlay.style.zIndex = "9999";

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(modal);
        document.body.removeChild(overlay);
      }
    });

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(modal);
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", handleKeydown);
      }
    };

    document.addEventListener("keydown", handleKeydown);
  }
  function addButtonToCard(card) {
    if (card.dataset.copyTagsBtnAdded) return;
    card.dataset.copyTagsBtnAdded = "1";
    card.style.position = card.style.position || "relative";

    const btnHTML = `<button type="button" class="gm-copy-tags-btn"
        style="position: absolute; bottom: 6px; right: 6px; z-index: 100; padding: 4px 6px; font-size: 12px; background: #0094CA; color: #fff; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
        📋
    </button>`;
    card.insertAdjacentHTML("beforeend", btnHTML);

    const btn = card.querySelector(".gm-copy-tags-btn");
    if (!btn) return;
    if (btn.dataset.listenerAdded) return;
    btn.dataset.listenerAdded = "1";

    btn.title = "复制视频标签、分区和UP主信息";

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      btn.disabled = true;
      const bv = extractBv(card);
      if (!bv) {
        showTempText(btn, "未找到BV");
        btn.disabled = false;
        return;
      }

      // 确保获取视频信息（包括分区和UP主信息）
      if (
        !videoInfoDict[bv] ||
        !videoInfoDict[bv].videoPartitions ||
        !videoInfoDict[bv].videoUpUid
      ) {
        getVideoApiInfo(bv);
        // 等待一下让API请求完成
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const tags = await fetchTags(bv);
      if (tags) {
        showTagSelectionUI(tags.split(","), bv);
        showTempText(btn, "已加载");
      } else {
        showTempText(btn, "无标签");
      }
      btn.disabled = false;
    });
  }

 /* function scanAndInject() {
    const cards = document.querySelectorAll(SELECTOR);
    cards.forEach((card) => {
      addButtonToCard(card);
    });
  }*/

  // 触发内容不感兴趣事件的函数
  function triggerNotInterestedEvent(element, eventData) {
    if (!element._vts) {
      element._vts = Date.now();
    } else if (element._vts <= eventData._vts) {
      return;
    }

    console.log("触发内容不感兴趣事件:", eventData);

    // 模拟B站的内容不感兴趣逻辑
    const videoElement = document
      .querySelector(`a[href*="${eventData.bv}"]`)
      ?.closest(".bili-video-card");
    if (videoElement) {
      // 添加视觉反馈
      videoElement.style.opacity = "0.7";
      videoElement.style.transition = "opacity 0.3s ease";

      // 隐藏视频卡片
      setTimeout(() => {
        if (videoElement.parentNode) {
          videoElement.style.display = "none";

          // 触发B站原生的不感兴趣事件（如果存在）
          const nativeEvent = new CustomEvent("bili-video-not-interested", {
            detail: eventData,
            bubbles: true,
          });
          videoElement.dispatchEvent(nativeEvent);
        }
      }, 500);
    }

    // 调用B站API（如果可用）
    callBilibiliNotInterestedAPI(eventData);
  }

  // 触发不想看此UP主事件的函数
  function triggerBlockUpEvent(element, eventData) {
    if (!element) {
      element = { _vts: Date.now() };
    }

    if (!element._vts) {
      element._vts = Date.now();
    } else if (element._vts <= eventData._vts) {
      return;
    }

    console.log("触发不想看此UP主事件:", eventData);

    // 自动添加到屏蔽列表
    if (!blockedParameter.blockedNameOrUid_Array.includes(eventData.upUid)) {
      blockedParameter.blockedNameOrUid_Array.push(eventData.upUid);
      GM_setValue("GM_blockedParameter", blockedParameter);
      consoleLogOutput(
        "已自动添加UP主到屏蔽列表:",
        eventData.upName,
        "UID:",
        eventData.upUid
      );
    }

    // 隐藏该UP主的所有视频
    hideUpVideos(eventData.upUid);

    // 调用B站API（如果可用）
    callBilibiliBlockUpAPI(eventData);
  }

 /* // 隐藏该UP主的所有视频
  function hideUpVideos(upUid) {
    const videoElements = getVideoElements();
    let hiddenCount = 0;

    videoElements.forEach((videoElement) => {
      const bv = getBvAndTitle(videoElement);
      if (bv && videoInfoDict[bv] && videoInfoDict[bv].videoUpUid === upUid) {
        // 添加屏蔽叠加层
        if (!videoElement.querySelector(".blockedOverlay")) {
          const elementRect = videoElement.getBoundingClientRect();

          let overlay = document.createElement("div");
          overlay.className = "blockedOverlay";
          overlay.style.position = "absolute";
          overlay.style.width = elementRect.width + "px";
          overlay.style.height = elementRect.height + "px";
          overlay.style.backgroundColor = "rgba(200, 60, 60, 0.85)";
          overlay.style.display = "flex";
          overlay.style.justifyContent = "center";
          overlay.style.alignItems = "center";
          overlay.style.zIndex = "10";
          overlay.style.backdropFilter = "blur(6px)";
          overlay.style.borderRadius = "6px";

          let overlayText = document.createElement("div");
          overlayText.innerText = "已屏蔽此UP主";
          overlayText.style.color = "rgb(250,250,250)";
          overlayText.style.fontWeight = "bold";
          overlay.appendChild(overlayText);

          videoElement.insertAdjacentElement("afterbegin", overlay);
          hiddenCount++;
        }
      }
    });

    consoleLogOutput(`已隐藏 ${hiddenCount} 个该UP主的视频`);
  }*/

// 隐藏该UP主的所有视频（覆盖叠加层 + 可撤销 + 显示标题）
function hideUpVideos(upUid) {
    const videoElements = getVideoElements();
    let hiddenCount = 0;

    videoElements.forEach((videoElement) => {
        const bvInfo = getBvAndTitle(videoElement);

        if (bvInfo && videoInfoDict[bvInfo] && videoInfoDict[bvInfo].videoUpUid === upUid) {

            if (!videoElement.querySelector(".blockedOverlay")) {
                const elementRect = videoElement.getBoundingClientRect();

                let overlay = document.createElement("div");
                overlay.className = "blockedOverlay";
                overlay.style.position = "absolute";
                overlay.style.width = elementRect.width + "px";
                overlay.style.height = elementRect.height + "px";
                overlay.style.backgroundColor = "rgba(36,36,36,0.85)";
                overlay.style.display = "flex";
                overlay.style.flexDirection = "column";
                overlay.style.justifyContent = "center";
                overlay.style.alignItems = "center";
                overlay.style.zIndex = "10";
                overlay.style.backdropFilter = "blur(6px)";
                overlay.style.borderRadius = "6px";
                overlay.style.padding = "6px";
                overlay.style.boxSizing = "border-box";

                // ===== 显示标题 =====
                let titleText = "(未知标题)";

                // 优先来自 videoInfoDict
                if (videoInfoDict[bvInfo]?.videoTitle) {
                    titleText = videoInfoDict[bvInfo].videoTitle;
                } else {
                    // fallback：直接从卡片DOM抓
                    const titleEl =
                        videoElement.querySelector(
                            ".bili-video-card__info--tit, h3, .title, a"
                        );
                    if (titleEl) {
                        titleText = (titleEl.textContent || "").trim();
                    }
                }

                const titleDiv = document.createElement("div");
                titleDiv.innerText = titleText;
                titleDiv.style.color = "white";
                titleDiv.style.fontSize = "14px";
                titleDiv.style.fontWeight = "600";
                titleDiv.style.marginBottom = "6px";
                titleDiv.style.maxWidth = "90%";
                titleDiv.style.overflow = "hidden";
                titleDiv.style.textOverflow = "ellipsis";
                titleDiv.style.whiteSpace = "nowrap";
                overlay.appendChild(titleDiv);

                // ===== 原文本 =====
                let overlayText = document.createElement("div");
                overlayText.innerText = "已屏蔽此UP主";
                overlayText.style.color = "rgb(220,220,220)";
                overlayText.style.fontWeight = "500";
                overlayText.style.fontSize = "12px";
                overlayText.style.marginBottom = "8px";
                overlay.appendChild(overlayText);

                // ===== 撤销按钮 =====
                const undoBtn = document.createElement("button");
                undoBtn.innerText = "撤销（临时查看）";
                undoBtn.style.padding = "6px 10px";
                undoBtn.style.border = "none";
                undoBtn.style.borderRadius = "4px";
                undoBtn.style.cursor = "pointer";
                undoBtn.style.background = "#fff";
                undoBtn.style.color = "#222";
                undoBtn.style.fontSize = "12px";
                undoBtn.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";

                undoBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    // 删除叠加层，仅影响当前视频卡片
                    if (overlay && overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                });

                overlay.appendChild(undoBtn);

                // ===== 插入叠加层 =====
                videoElement.insertAdjacentElement("afterbegin", overlay);
                hiddenCount++;
            }
        }
    });

    consoleLogOutput(`已隐藏 ${hiddenCount} 个该UP主的视频`);
}

let scanTimeout = null;

function findCandidateCards() {
  const anchors = Array.from(document.querySelectorAll('a[href]'));
  const videoAnchors = anchors.filter(a => /\/(BV[0-9A-Za-z]+|av\d+|\/video\/)/.test(a.href));
  const cardSet = new Set();
  for (const a of videoAnchors) {
    // 优先常见卡片祖先
    let card = a.closest(".bili-video-card, .video-item, .video-card, li.bili-rank-list-video__item, .video-page-card-small, .rank-item");
    if (!card) {
      // 向上找最近的包含图片或标题的容器，最多向上走 6 层
      let node = a;
      for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
        if (!node) break;
        if (node.querySelector && (node.querySelector("img") || node.querySelector("h3") || node.querySelector(".title") || node.querySelector(".info"))) {
          card = node;
          break;
        }
      }
    }
    if (!card) {
      // 兜底：尝试上溯两层
      let p = a.parentElement;
      if (p && p.parentElement) card = p.parentElement;
    }
    if (card) cardSet.add(card);
  }
  return Array.from(cardSet);
}

function injectButtonIfNeeded(card) {
  if (!card || card.dataset.copyTagsBtnAdded === "1") return;
  try {
    card.dataset.copyTagsBtnAdded = "1";
    // 保证定位以便插按钮
    if (!card.style.position || card.style.position === "") {
      card.style.position = "relative";
    }

    // 创建按钮
    const btn = document.createElement("button");
    btn.className = "gm-copy-tags-btn";
    btn.textContent = "📋";
    btn.title = "复制/屏蔽（脚本）";
    btn.style.cssText = "position:absolute;right:6px;bottom:6px;z-index:99999;padding:4px 6px;border-radius:6px;border:0;background:#0094CA;color:#fff;cursor:pointer;";

    card.appendChild(btn);

    btn.addEventListener("click", async (e) => {
      try {
        e.stopPropagation();
        e.preventDefault();
        btn.disabled = true;

        // -----------------------
        // 1) 提取 href 和 BV（兼容 av）
        // -----------------------
        const a = card.querySelector('a[href*="/BV"], a[href*="/av"], a[href*="/video/"]') || card.querySelector('a[href]');
        const href = a ? a.href : "";
        let bv = null;

        if (href) {
          const m = href.match(/\/(BV[0-9A-Za-z]+)/);
          if (m) bv = m[1];
          else {
            const m2 = href.match(/\/av(\d+)/i);
            if (m2 && typeof av2bv === "function") {
              try { bv = av2bv(m2[1]); } catch (err) { console.warn("[injectBtn] av2bv failed", err); }
            }
          }
        }

        console.log("[gm-copy] 点击按钮，bv=", bv, " href=", href);

        if (!bv) {
          // 尝试在 card 内搜索更多 a 标签
          const allA = card.querySelectorAll('a[href]');
          for (const aa of allA) {
            const hm = aa.href.match(/\/(BV[0-9A-Za-z]+)/);
            if (hm) { bv = hm[1]; break; }
            const hm2 = aa.href.match(/\/av(\d+)/i);
            if (hm2 && typeof av2bv === "function") {
              try { bv = av2bv(hm2[1]); break; } catch (e) {}
            }
          }
        }

        if (!bv) {
          alert("无法识别 BV，无法显示屏蔽界面");
          btn.disabled = false;
          return;
        }

        // -----------------------
        // 2) 确保 videoInfoDict[bv] 有足够数据：执行 API 请求（如果需要）
        // -----------------------
        try {
          if (
            typeof videoInfoDict === "object" &&
            (!videoInfoDict[bv] ||
              !videoInfoDict[bv].videoPartitions ||
              !videoInfoDict[bv].videoUpUid)
          ) {
            // 原脚本中 getVideoApiInfo 可被 await（它内部会 fetch 并填充 videoInfoDict）
            if (typeof getVideoApiInfo === "function") {
              await getVideoApiInfo(bv);
              // 确保有短暂等待给 then 回调执行
              await new Promise((r) => setTimeout(r, 300));
            } else {
              console.warn("[gm-copy] getVideoApiInfo not found");
            }
          }
        } catch (err) {
          console.warn("[gm-copy] getVideoApiInfo error:", err);
        }

        // -----------------------
        // 3) 获取 tags（如果有），并调用原有 UI 展示函数
        // -----------------------
        let tagsRaw = null;
        try {
          if (typeof fetchTags === "function") {
            tagsRaw = await fetchTags(bv); // 期望返回 "tag1,tag2,..." 或 null
          } else {
            console.warn("[gm-copy] fetchTags not found");
          }
        } catch (err) {
          console.warn("[gm-copy] fetchTags error:", err);
        }

        // 将 tags 拆成数组（或空数组）
        let tagsArray = [];
        if (tagsRaw && typeof tagsRaw === "string") {
          tagsArray = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);
        }

        // 优先使用原来的 UI 展示函数
        if (typeof showTagSelectionUI === "function") {
          try {
            showTagSelectionUI(tagsArray, bv);
          } catch (err) {
            console.error("[gm-copy] showTagSelectionUI 调用失败：", err);
            // 兜底：简单弹窗显示 tags
            alert("tag 列表: " + (tagsArray.length ? tagsArray.join(", ") : "无"));
          }
        } else {
          // 若原脚本缺少 showTagSelectionUI，则给用户一个简单的提示 UI（临时）
          alert("Tags: " + (tagsArray.length ? tagsArray.join(", ") : "无") + "\nBV: " + bv);
        }

        // 这里不直接触发 triggerNotInterestedEvent 等销毁类操作（保留给用户在 UI 中选择）
        // 但若你希望点击后直接一键屏蔽 UP 或内容不感兴趣，可以在 showTagSelectionUI 回调里调用 triggerNotInterestedEvent
      } catch (errMain) {
        console.error("[gm-copy] 按钮处理异常：", errMain);
        alert("发生错误，详见控制台");
      } finally {
        btn.disabled = false;
      }
    });

  } catch (err) {
    console.error("[injectButtonIfNeeded] error:", err);
  }
}

new MutationObserver(() => {
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(scanAndInject, 250);
}).observe(document.body, { childList: true, subtree: true });

  function scanAndInject() {
  try {
    const cards = findCandidateCards();
    for (const card of cards) injectButtonIfNeeded(card);
  } catch (e) {
    console.error("[scanAndInject] error", e);
  }
  }

  function callBilibiliNotInterestedAPI(eventData) {
    // 这里可以调用B站实际的内容不感兴趣API
    // 注意：需要获取正确的csrf token和API端点
    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) return;

      fetch("https://api.bilibili.com/x/feed/dislike", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          id: eventData.bv,
          type: "av",
          reason: 1,
          csrf: csrfToken,
        }),
      })
        .then((response) => response.json())
        .then((result) => {
          console.log("内容不感兴趣API响应:", result);
        })
        .catch((error) => {
          console.log("内容不感兴趣API调用失败:", error);
        });
    } catch (error) {
      console.log("内容不感兴趣API调用异常:", error);
    }
  }

  function callBilibiliBlockUpAPI(eventData) {
    // 这里可以调用B站实际的屏蔽UP主API
    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) return;

      fetch("https://api.bilibili.com/x/relation/modify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          fid: eventData.upUid,
          act: 5, // 5表示屏蔽
          re_src: 11,
          csrf: csrfToken,
        }),
      })
        .then((response) => response.json())
        .then((result) => {
          console.log("屏蔽UP主API响应:", result);
        })
        .catch((error) => {
          console.log("屏蔽UP主API调用失败:", error);
        });
    } catch (error) {
      console.log("屏蔽UP主API调用异常:", error);
    }
  }

  scanAndInject();

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        scanAndInject();
        break;
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  (function () {
    const contextMenu = document.createElement("div");
    contextMenu.id = "bili-up-context-menu";
    contextMenu.style.cssText = `
          position: fixed;
          display: none;
          background: #2a2a2a;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10000;
          padding: 8px 0;
          min-width: 120px;
      `;

    const followItem = document.createElement("div");
    followItem.textContent = "关注";
    followItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          color: #fff;
          font-size: 14px;
      `;
    followItem.onmouseover = () => (followItem.style.background = "#3a3a3a");
    followItem.onmouseout = () => (followItem.style.background = "transparent");

    const blockItem = document.createElement("div");
    blockItem.textContent = "屏蔽";
    blockItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          color: #fff;
          font-size: 14px;
      `;
    blockItem.onmouseover = () => (blockItem.style.background = "#3a3a3a");
    blockItem.onmouseout = () => (blockItem.style.background = "transparent");

    contextMenu.appendChild(followItem);
    contextMenu.appendChild(blockItem);
    document.body.appendChild(contextMenu);

    let currentUpInfo = null;

    document.addEventListener("contextmenu", function (e) {
      const upElement = e.target.closest(
        ".bili-video-card__info--author, .bili-video-card__info--owner"
      );
      if (upElement) {
        e.preventDefault();

        const ownerLink = upElement.closest(".bili-video-card__info--owner");
        if (ownerLink) {
          const uidMatch = ownerLink.href.match(/space\.bilibili\.com\/(\d+)/);
          if (uidMatch) {
            currentUpInfo = {
              uid: uidMatch[1],
              name: upElement.textContent.trim(),
              href: ownerLink.href,
              element: upElement,
            };

            const rect = upElement.getBoundingClientRect();

            contextMenu.style.display = "block";
            contextMenu.style.left = rect.left + "px";
            contextMenu.style.top = rect.bottom + window.scrollY + "px";
          }
        }
      }
    });

    document.addEventListener("click", function () {
      contextMenu.style.display = "none";
    });

    blockItem.addEventListener("click", function () {
      if (currentUpInfo) {
        if (
          !blockedParameter.blockedNameOrUid_Array.includes(currentUpInfo.uid)
        ) {
          blockedParameter.blockedNameOrUid_Array.push(currentUpInfo.uid);
          GM_setValue("GM_blockedParameter", blockedParameter);

          alert(
            `已屏蔽UP主: ${currentUpInfo.name} (UID: ${currentUpInfo.uid})`
          );

          FuckYouBilibiliRecommendationSystem();
        } else {
          alert(`UP主 ${currentUpInfo.name} 已在屏蔽列表中`);
        }
      }
      contextMenu.style.display = "none";
    });

    followItem.addEventListener("click", async function () {
      if (!currentUpInfo) return;

      try {
        const csrfToken = getCsrfToken();

        const response = await fetch(
          "https://api.bilibili.com/x/relation/modify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              fid: currentUpInfo.uid,
              act: 1,
              re_src: 11,
              csrf: csrfToken,
            }),
          }
        );

        const result = await response.json();

        if (result.code === 0) {
          alert(`成功关注UP主: ${currentUpInfo.name}`);
        } else {
          alert(`关注失败: ${result.message}`);
        }
      } catch (error) {
        console.error("API关注失败:", error);
        alert("关注失败，请确保已登录B站");
      }

      contextMenu.style.display = "none";
    });

    function getCsrfToken() {
      const cookieMatch = document.cookie.match(/bili_jct=([^;]+)/);
      return cookieMatch ? cookieMatch[1] : "";
    }
  })();

  (function () {
    "use strict";
    const currentHost = window.location.hostname;
    const currentPath = window.location.pathname;

    const injectStyle = (css) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    };

    if (
      currentHost === "live.bilibili.com" &&
      (currentPath === "/" || currentPath === "")
    ) {
      injectStyle(`
              .player-area-ctnr.border-box.p-relative.t-center {
                  display: none !important;
              }
          `);

      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        const stack = new Error().stack || "";
        if (stack.includes("home-player.prod.min.js")) {
          this.pause();
          this.currentTime = 0;
          this.removeAttribute("autoplay");
          return Promise.reject(new DOMException("play() failed"));
        }
        return originalPlay.apply(this, arguments);
      };
    }

    if (
      currentHost === "www.bilibili.com" &&
      (currentPath === "/" || currentPath === "")
    ) {
      injectStyle(`
              .bili-video-card__skeleton.loading_animation,
              .recommended-swipe,
              .bili-live-card.is-rcmd.enable-no-interest,
              .ad-report.ad-floor-exp.left-banner,
              .floor-single-card,
              .fixed-card {
                  display: none !important;
              }
              .feed-card {
                  margin-top: 0 !important;
              }
          `);

      const selectors = {
        pseudo: ".bili-video-card.is-rcmd",
        icons: ".vui_icon.bili-video-card__stats--icon",
        adFeed: ".bili-video-card__mask .bili-video-card__stats--text",
      };

      const isBlocked = (element) => {
        if (element.dataset.checked) return element.dataset.blocked === "true";
        const content = getComputedStyle(element, "::before").content;
        const blocked =
          content.includes("AdGuard") || content.includes("AdBlock");
        element.dataset.checked = "true";
        element.dataset.blocked = blocked;
        return blocked;
      };

      const checkElements = (selector, condition, parentSelector) => {
        document.querySelectorAll(selector).forEach((el) => {
          const target = parentSelector ? el.closest(parentSelector) : el;
          if (target && (!condition || condition(el))) {
            target.style.display = "none";
            target.dataset.processed = "true";
          }
        });
      };

      const debounce = (fn, delay = 100) => {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => fn(...args), delay);
        };
      };

      const observer = new MutationObserver(
        debounce(() => {
          checkElements(
  selectors.pseudo,
  (el) => {
    // ❶ 如果这个元素在视频卡片内 → 禁止处理
    if (el.closest(".bili-video-card") || el.closest(".bili-video-card__wrap")) {
      return false;  // 永远不过滤视频真实卡片
    }

    // ❷ 如果这个元素是 feed 正常项 → 禁止处理
    if (el.closest(".feed-card") || el.closest(".bili-feed-card")) {
      return false;
    }

    // ❸ 原始判断：只有明确命中屏蔽条件才处理
    return isBlocked(el) || [...el.children].some(isBlocked);
  }
);
          checkElements(selectors.icons, null, ".bili-video-card");
          checkElements(
            selectors.adFeed,
            (el) => el.textContent.includes("广告"),
            ".bili-video-card__wrap"
          );
        })
      );

      observer.observe(document.body, { subtree: true, childList: true });
    }

    if (
      currentHost === "www.bilibili.com" &&
      currentPath.startsWith("/video/")
    ) {
      injectStyle(`
              .bpx-player-qoeFeedback,
              .bili-danmaku-x-guide.bili-danmaku-x-show,
              .bili-danmaku-x-cmd-shrink,
              .bili-danmaku-x-link.bili-danmaku-x-show,
              .bili-danmaku-x-scoreSum.bili-danmaku-x-show,
              .bili-danmaku-x-vote.bili-danmaku-x-show,
              .bili-danmaku-x-score.bili-danmaku-x-show,
              .bili-danmaku-x-guide-all.bili-danmaku-x-guide.bili-danmaku-x-show,
              .bili-danmaku-x-follow-to-electric.bili-danmaku-x-guide-all.bili-danmaku-x-guide.bili-danmaku-x-show,
              .ad-report.strip-ad.left-banner,
              .ad-report.ad-floor-exp.left-banner,
              .ad-report.ad-floor-exp.right-bottom-banner,
              .activity-m-v1.act-end,
              .activity-m-v1.act-now,
              .video-card-ad-small,
              .video-page-game-card-small,
              .slide-ad-exp {
                  display: none !important;
              }
          `);
    }

    if (currentHost === "search.bilibili.com") {
      injectStyle(`
              .col_3.col_xs_1_5.col_md_2.col_xl_1_7.mb_x40:has(.bili-video-card__info--ad),
              .col_3.col_xs_1_5.col_md_2.col_xl_1_7.mb_x40:has(.bili-video-card__info--ad-creative) {
                  display: none !important;
              }
          `);
    }

    if (currentHost === "t.bilibili.com") {
      injectStyle(`
              .bili-dyn-ads {
                  display: none !important;
              }
          `);
    }
  })();
})();
