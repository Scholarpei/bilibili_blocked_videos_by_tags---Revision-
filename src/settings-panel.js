import {
  addListItems,
  clone,
  formatTimestamp,
  mergeImportedSettings,
  normalizeSettings,
  removeListItem,
  validateImportedSettings,
} from "./config.js";

const OPTION_DEFS = [
  { kind: "number", switchKey: "blockedBelowVideoFavorite_Switch", valueKey: "blockedBelowVideoFavorite", label: "屏蔽低于此收藏数的视频(?)", title: "视频API，是拿到视频的收藏数后判断的", unit: "次" },
  { kind: "list", switchKey: "blockedTitle_Switch", regexKey: "blockedTitle_UseRegular", listKey: "blockedTitle_Array", label: "按标题屏蔽视频(?)", title: "不需要API，网页上直接有标题信息", placeholder: "多项输入请用英文逗号间隔" },
  { kind: "list", switchKey: "blockedNameOrUid_Switch", regexKey: "blockedNameOrUid_UseRegular", listKey: "blockedNameOrUid_Array", label: "按UP名称或Uid屏蔽视频(?)", title: "大部分情况也是可以在网页上直接拿到", placeholder: "多项输入请用英文逗号间隔" },
  { kind: "list", switchKey: "blockedTag_Switch", regexKey: "blockedTag_UseRegular", listKey: "blockedTag_Array", label: "按标签屏蔽视频(?)", title: "标签API，要注意有一些标签可能是分区", placeholder: "多项输入请用英文逗号间隔" },
  { kind: "list", switchKey: "doubleBlockedTag_Switch", regexKey: "doubleBlockedTag_UseRegular", listKey: "doubleBlockedTag_Array", label: "按双重标签屏蔽视频(?)", title: "视频包含一对指定标签时才会生效，例如：原神|鸣潮", placeholder: '多项输入请用英文逗号间隔(以"A标签|B标签"格式添加)' },
  { kind: "switch", switchKey: "blockedChargingExclusive_Switch", label: "屏蔽充电专属的视频(?)", title: "视频API，是拿到视频的充电视频标记后判断的" },
  { kind: "number", switchKey: "blockedAboveFavoriteCoinRatio_Switch", valueKey: "blockedAboveFavoriteCoinRatio", label: "屏蔽高于此收藏/投币比的视频(?)", title: "只处理播放数5000+、收藏数50+、发布时间2小时+的视频" },
  { kind: "switch", switchKey: "blockedPortraitVideo_Switch", label: "屏蔽竖屏视频(?)", title: "视频API，是拿到视频的分辨率后判断的" },
  { kind: "number", switchKey: "blockedShortDuration_Switch", valueKey: "blockedShortDuration", label: "屏蔽低于此时长的视频(?)", title: "视频API，是拿到视频的时长后判断的", unit: "秒" },
  { kind: "number", switchKey: "blockedBelowVideoViews_Switch", valueKey: "blockedBelowVideoViews", label: "屏蔽低于此播放量的视频(?)", title: "视频API，是拿到视频的播放量后判断的", unit: "次" },
  { kind: "number", switchKey: "blockedBelowLikesRate_Switch", valueKey: "blockedBelowLikesRate", label: "屏蔽低于此点赞率的视频(?)", title: "视频API，是拿到视频的播放量和点赞数后判断的", unit: "%" },
  { kind: "number", switchKey: "blockedBelowCoinRate_Switch", valueKey: "blockedBelowCoinRate", label: "屏蔽低于此投币率的视频(?)", title: "视频API，是拿到视频的播放量和投币数后判断的", unit: "%" },
  { kind: "list", switchKey: "blockedVideoPartitions_Switch", regexKey: "blockedVideoPartitions_UseRegular", listKey: "blockedVideoPartitions_Array", label: "按视频分区屏蔽视频(?)", title: "视频API，现在视频的分区可能不是很好确定名字，可以看日志来判断", placeholder: "多项输入请用英文逗号间隔" },
  { kind: "number", switchKey: "blockedBelowUpLevel_Switch", valueKey: "blockedBelowUpLevel", label: "屏蔽低于此UP主等级的视频(?)", title: "UP主API，是拿到UP主的等级信息后判断的", unit: "级" },
  { kind: "number", switchKey: "blockedBelowUpFans_Switch", valueKey: "blockedBelowUpFans", label: "屏蔽低于此UP主粉丝数的视频(?)", title: "UP主API，是拿到UP主的粉丝数后判断的", unit: "人" },
  { kind: "number", switchKey: "blockedAboveUpAttention_Switch", valueKey: "blockedAboveUpAttention", label: "屏蔽高于此UP主关注数的视频(?)", title: "UP主API，是拿到UP主的关注数后判断的", unit: "人" },
  { kind: "list", switchKey: "blockedUpSigns_Switch", regexKey: "blockedUpSigns_UseRegular", listKey: "blockedUpSigns_Array", label: "按UP主简介屏蔽视频(?)", title: "UP主API，是拿到UP主的简介后判断的", placeholder: "多项输入请用英文逗号间隔" },
  { kind: "switch", switchKey: "blockedFilteredCommentsVideo_Switch", label: "屏蔽精选评论的视频(?)", title: "评论API，极易请求过多导致拒绝" },
  { kind: "list", switchKey: "blockedTopComment_Switch", regexKey: "blockedTopComment_UseRegular", listKey: "blockedTopComment_Array", label: "按置顶评论屏蔽视频(?)", title: "评论API，极易请求过多导致拒绝", placeholder: "多项输入请用英文逗号间隔" },
  { kind: "list", switchKey: "whitelistNameOrUid_Switch", listKey: "whitelistNameOrUid_Array", label: "按UP名称或Uid避免屏蔽视频(?)", title: "白名单，在最后进行的判断，有最高的优先级", placeholder: "多项输入请用英文逗号间隔" },
  { kind: "switch", switchKey: "hideTrending_Switch", label: "隐藏搜索框的热搜内容(?)", title: "直接隐藏所有的热搜项" },
  { kind: "switch", switchKey: "blockedTrendingItemByTitleTag_Switch", label: "按已有的标题项屏蔽热搜项(?)", title: "直接按已有标题屏蔽项来屏蔽热搜项" },
  { kind: "list", switchKey: "blockedTrendingItem_Switch", regexKey: "blockedTrendingItem_UseRegular", listKey: "blockedTrendingItem_Array", label: "按关键字屏蔽热搜项(?)", title: "类似标题的用法", placeholder: "多项输入请用英文逗号间隔" },
  { kind: "switch", switchKey: "hideNonVideoElements_Switch", label: "隐藏首页等页面的非视频元素(?)", title: "去广告、直播、推广等非投稿视频内容" },
  { kind: "switch", switchKey: "blockedOverlayOnlyDisplaysType_Switch", label: "屏蔽叠加层的提示只显示类型(?)", title: "防止显示命中的屏蔽词" },
  { kind: "switch", switchKey: "hideVideoMode_Switch", label: "隐藏视频而不是使用叠加层覆盖(?)", title: "隐藏视频而不是使用叠加层覆盖" },
  { kind: "switch", switchKey: "consoleOutputLog_Switch", label: "控制台输出日志开关(?)", title: "输出调试日志" },
];

function checkbox(checked, onChange) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

function makeButton(text, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  if (className) button.className = className;
  button.addEventListener("click", onClick);
  return button;
}

export function openSettingsPanel({ getSettings, setSettings, onSave }) {
  if (document.getElementById("blockedMenuUi")) return;

  let draft = normalizeSettings(getSettings());
  const backdrop = document.createElement("div");
  backdrop.className = "bbt-menu-backdrop";

  const panel = document.createElement("div");
  panel.id = "blockedMenuUi";

  const closePanel = () => {
    panel.remove();
    backdrop.remove();
  };

  backdrop.addEventListener("click", closePanel);

  const header = document.createElement("header");
  header.className = "bbt-menu-header";

  const title = document.createElement("div");
  title.className = "bbt-menu-title";
  title.textContent = "Bilibili按标签、标题、时长、UP主屏蔽视频 v1.5.0";
  header.appendChild(title);
  header.appendChild(makeButton("关闭", closePanel, "bbt-modal-close"));
  panel.appendChild(header);

  const prompt = document.createElement("div");
  prompt.id = "blockedMenuPrompt";
  prompt.style.opacity = "0";

  const showPrompt = (text) => {
    prompt.textContent = text;
    prompt.style.opacity = "1";
    setTimeout(() => {
      prompt.style.opacity = "0";
    }, 1500);
  };

  const renderList = (ul, def) => {
    ul.textContent = "";
    const values = draft[def.listKey] || [];
    values.forEach((value, index) => {
      const li = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = value;
      li.appendChild(text);
      li.appendChild(
        makeButton("x", () => {
          removeListItem(draft, def.listKey, index);
          renderList(ul, def);
        }),
      );
      ul.appendChild(li);
    });
  };

  for (const def of OPTION_DEFS) {
    const row = document.createElement("div");
    row.className = "bbt-option";

    const label = document.createElement("label");
    label.title = def.title;
    label.appendChild(
      checkbox(draft[def.switchKey], (checked) => {
        draft[def.switchKey] = checked;
      }),
    );
    label.append(def.label);
    row.appendChild(label);

    if (def.regexKey) {
      const regexLabel = document.createElement("label");
      regexLabel.title = "正则是什么可以问AI，你也可以理解成模糊匹配";
      regexLabel.appendChild(
        checkbox(draft[def.regexKey], (checked) => {
          draft[def.regexKey] = checked;
        }),
      );
      regexLabel.append("启用正则(?)");
      row.appendChild(regexLabel);
    } else {
      row.appendChild(document.createElement("span"));
    }

    if (def.kind === "number") {
      const input = document.createElement("input");
      input.type = "number";
      input.value = draft[def.valueKey];
      input.addEventListener("input", () => {
        draft[def.valueKey] = Number(input.value || 0);
      });
      row.appendChild(input);
      if (def.unit) row.append(def.unit);
    } else if (def.kind === "list") {
      const wrapper = document.createElement("div");
      wrapper.className = "bbt-list-row";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = def.placeholder || "多项输入请用英文逗号间隔";
      wrapper.appendChild(input);
      const list = document.createElement("ul");
      wrapper.appendChild(
        makeButton("添加", () => {
          addListItems(draft, def.listKey, input.value);
          input.value = "";
          renderList(list, def);
        }),
      );
      row.appendChild(wrapper);
      row.appendChild(list);
      renderList(list, def);
    }

    panel.appendChild(row);
  }

  const buttons = document.createElement("div");
  buttons.className = "bbt-menu-buttons";
  buttons.appendChild(
    makeButton("读取", () => {
      draft = normalizeSettings(getSettings());
      closePanel();
      openSettingsPanel({ getSettings, setSettings, onSave });
    }),
  );
  buttons.appendChild(
    makeButton("保存", () => {
      const saved = setSettings(draft);
      draft = clone(saved);
      showPrompt("保存数据");
      onSave?.();
    }),
  );
  buttons.appendChild(makeButton("关闭", closePanel));
  buttons.appendChild(
    makeButton("导出", () => {
      const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Bilibili_blocked_videos_by_tags_Config_${formatTimestamp()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showPrompt("设置导出成功");
    }),
  );
  buttons.appendChild(
    makeButton("导入", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const imported = JSON.parse(await file.text());
          if (!validateImportedSettings(imported)) throw new Error("无效的配置文件");
          draft = mergeImportedSettings(draft, imported);
          closePanel();
          openSettingsPanel({ getSettings: () => draft, setSettings, onSave });
        } catch (error) {
          console.error("导入设置时出错:", error);
          showPrompt("导入失败: 文件格式错误");
        }
      });
      input.click();
    }),
  );
  buttons.appendChild(makeButton("作者", () => window.open("https://space.bilibili.com/351422438", "_blank")));
  buttons.appendChild(makeButton("赞助", () => window.open("https://afdian.com/a/tjxgame", "_blank")));
  panel.appendChild(buttons);
  panel.appendChild(prompt);

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
}

export function installFloatingConfigButton(openPanel) {
  if (document.querySelector(".bbt-floating-config")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bbt-floating-config";
  button.textContent = "脚本配置";
  button.addEventListener("click", openPanel);
  document.body.appendChild(button);
}
