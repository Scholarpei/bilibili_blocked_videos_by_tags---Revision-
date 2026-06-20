import {
  addListItems,
  clone,
  formatTimestamp,
  mergeImportedSettings,
  normalizeSettings,
  removeListItem,
  validateImportedSettings,
} from "./config.js";

const OPTION_GROUPS = [
  {
    title: "常用规则",
    summary: "标题、UP、标签和白名单，优先配置这里。",
    options: [
      { kind: "list", switchKey: "blockedTitle_Switch", regexKey: "blockedTitle_UseRegular", listKey: "blockedTitle_Array", label: "按标题屏蔽", title: "不需要API，网页上直接有标题信息", placeholder: "多项输入请用英文逗号间隔" },
      { kind: "list", switchKey: "blockedNameOrUid_Switch", regexKey: "blockedNameOrUid_UseRegular", listKey: "blockedNameOrUid_Array", label: "按UP名称或Uid屏蔽", title: "大部分情况也是可以在网页上直接拿到", placeholder: "多项输入请用英文逗号间隔" },
      { kind: "list", switchKey: "blockedTag_Switch", regexKey: "blockedTag_UseRegular", listKey: "blockedTag_Array", label: "按标签屏蔽", title: "标签API，要注意有一些标签可能是分区", placeholder: "多项输入请用英文逗号间隔" },
      { kind: "list", switchKey: "doubleBlockedTag_Switch", regexKey: "doubleBlockedTag_UseRegular", listKey: "doubleBlockedTag_Array", label: "按双重标签屏蔽", title: "视频包含一对指定标签时才会生效，例如：原神|鸣潮", placeholder: '多项输入请用英文逗号间隔(以"A标签|B标签"格式添加)' },
      { kind: "list", switchKey: "whitelistNameOrUid_Switch", listKey: "whitelistNameOrUid_Array", label: "UP白名单", title: "白名单，在最后进行的判断，有最高的优先级", placeholder: "多项输入请用英文逗号间隔" },
    ],
  },
  {
    title: "视频指标",
    summary: "基于播放、收藏、点赞、时长等视频API数据判断。",
    options: [
      { kind: "number", switchKey: "blockedBelowVideoFavorite_Switch", valueKey: "blockedBelowVideoFavorite", label: "低于收藏数", title: "视频API，是拿到视频的收藏数后判断的", unit: "次" },
      { kind: "number", switchKey: "blockedAboveFavoriteCoinRatio_Switch", valueKey: "blockedAboveFavoriteCoinRatio", label: "高于收藏/投币比", title: "只处理播放数5000+、收藏数50+、发布时间2小时+的视频" },
      { kind: "number", switchKey: "blockedShortDuration_Switch", valueKey: "blockedShortDuration", label: "低于视频时长", title: "视频API，是拿到视频的时长后判断的", unit: "秒" },
      { kind: "number", switchKey: "blockedBelowVideoViews_Switch", valueKey: "blockedBelowVideoViews", label: "低于播放量", title: "视频API，是拿到视频的播放量后判断的", unit: "次" },
      { kind: "number", switchKey: "blockedBelowLikesRate_Switch", valueKey: "blockedBelowLikesRate", label: "低于点赞率", title: "视频API，是拿到视频的播放量和点赞数后判断的", unit: "%" },
      { kind: "number", switchKey: "blockedBelowCoinRate_Switch", valueKey: "blockedBelowCoinRate", label: "低于投币率", title: "视频API，是拿到视频的播放量和投币数后判断的", unit: "%" },
      { kind: "switch", switchKey: "blockedChargingExclusive_Switch", label: "屏蔽充电专属", title: "视频API，是拿到视频的充电视频标记后判断的" },
      { kind: "switch", switchKey: "blockedPortraitVideo_Switch", label: "屏蔽竖屏视频", title: "视频API，是拿到视频的分辨率后判断的" },
      { kind: "list", switchKey: "blockedVideoPartitions_Switch", regexKey: "blockedVideoPartitions_UseRegular", listKey: "blockedVideoPartitions_Array", label: "按视频分区屏蔽", title: "视频API，现在视频的分区可能不是很好确定名字，可以看日志来判断", placeholder: "多项输入请用英文逗号间隔" },
    ],
  },
  {
    title: "UP主与评论",
    summary: "基于UP主信息和评论API，评论相关请求更重。",
    options: [
      { kind: "number", switchKey: "blockedBelowUpLevel_Switch", valueKey: "blockedBelowUpLevel", label: "低于UP主等级", title: "UP主API，是拿到UP主的等级信息后判断的", unit: "级" },
      { kind: "number", switchKey: "blockedBelowUpFans_Switch", valueKey: "blockedBelowUpFans", label: "低于UP主粉丝数", title: "UP主API，是拿到UP主的粉丝数后判断的", unit: "人" },
      { kind: "number", switchKey: "blockedAboveUpAttention_Switch", valueKey: "blockedAboveUpAttention", label: "高于UP主关注数", title: "UP主API，是拿到UP主的关注数后判断的", unit: "人" },
      { kind: "list", switchKey: "blockedUpSigns_Switch", regexKey: "blockedUpSigns_UseRegular", listKey: "blockedUpSigns_Array", label: "按UP主简介屏蔽", title: "UP主API，是拿到UP主的简介后判断的", placeholder: "多项输入请用英文逗号间隔" },
      { kind: "switch", switchKey: "blockedFilteredCommentsVideo_Switch", label: "屏蔽精选评论视频", title: "评论API，极易请求过多导致拒绝" },
      { kind: "list", switchKey: "blockedTopComment_Switch", regexKey: "blockedTopComment_UseRegular", listKey: "blockedTopComment_Array", label: "按置顶评论屏蔽", title: "评论API，极易请求过多导致拒绝", placeholder: "多项输入请用英文逗号间隔" },
    ],
  },
  {
    title: "页面显示",
    summary: "热搜、非视频元素、叠加层与调试选项。",
    options: [
      { kind: "switch", switchKey: "hideTrending_Switch", label: "隐藏搜索框热搜", title: "直接隐藏所有的热搜项" },
      { kind: "switch", switchKey: "blockedTrendingItemByTitleTag_Switch", label: "用标题规则屏蔽热搜", title: "直接按已有标题屏蔽项来屏蔽热搜项" },
      { kind: "list", switchKey: "blockedTrendingItem_Switch", regexKey: "blockedTrendingItem_UseRegular", listKey: "blockedTrendingItem_Array", label: "按关键字屏蔽热搜", title: "类似标题的用法", placeholder: "多项输入请用英文逗号间隔" },
      { kind: "switch", switchKey: "hideNonVideoElements_Switch", label: "隐藏非视频元素", title: "去广告、直播、推广等非投稿视频内容" },
      { kind: "switch", switchKey: "blockedOverlayOnlyDisplaysType_Switch", label: "叠加层只显示类型", title: "防止显示命中的屏蔽词" },
      { kind: "switch", switchKey: "hideVideoMode_Switch", label: "直接隐藏视频", title: "隐藏视频而不是使用叠加层覆盖" },
      { kind: "switch", switchKey: "consoleOutputLog_Switch", label: "控制台日志", title: "输出调试日志" },
    ],
  },
];

function checkbox(checked, onChange) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "bbt-switch";
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
  title.textContent = "脚本配置";
  const subtitle = document.createElement("div");
  subtitle.className = "bbt-menu-subtitle";
  subtitle.textContent = "Bilibili 视频屏蔽规则 v1.5.0";
  const titleWrap = document.createElement("div");
  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);
  header.appendChild(titleWrap);
  const closeButton = makeButton("", closePanel, "bbt-modal-close");
  closeButton.title = "关闭";
  header.appendChild(closeButton);
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
        }, "bbt-chip-remove"),
      );
      ul.appendChild(li);
    });
  };

  for (const groupDef of OPTION_GROUPS) {
    const section = document.createElement("section");
    section.className = "bbt-option-group";

    const groupHeader = document.createElement("div");
    groupHeader.className = "bbt-option-group-header";
    const groupTitle = document.createElement("h3");
    groupTitle.textContent = groupDef.title;
    const groupSummary = document.createElement("p");
    groupSummary.textContent = groupDef.summary;
    groupHeader.appendChild(groupTitle);
    groupHeader.appendChild(groupSummary);
    section.appendChild(groupHeader);

    for (const def of groupDef.options) {
      const row = document.createElement("div");
      row.className = `bbt-option bbt-option-${def.kind}`;

      const main = document.createElement("div");
      main.className = "bbt-option-main";
      const label = document.createElement("label");
      label.className = "bbt-option-label";
      label.title = def.title;
      label.appendChild(
        checkbox(draft[def.switchKey], (checked) => {
          draft[def.switchKey] = checked;
        }),
      );
      label.append(def.label);
      const hint = document.createElement("div");
      hint.className = "bbt-option-hint";
      hint.textContent = def.title;
      main.appendChild(label);
      main.appendChild(hint);
      row.appendChild(main);

      const controls = document.createElement("div");
      controls.className = "bbt-option-controls";

      if (def.regexKey) {
        const regexLabel = document.createElement("label");
        regexLabel.className = "bbt-regex-toggle";
        regexLabel.title = "正则是什么可以问AI，你也可以理解成模糊匹配";
        regexLabel.appendChild(
          checkbox(draft[def.regexKey], (checked) => {
            draft[def.regexKey] = checked;
          }),
        );
        regexLabel.append("正则");
        controls.appendChild(regexLabel);
      }

      if (def.kind === "number") {
        const valueWrap = document.createElement("div");
        valueWrap.className = "bbt-number-field";
        const input = document.createElement("input");
        input.type = "number";
        input.value = draft[def.valueKey];
        input.addEventListener("input", () => {
          draft[def.valueKey] = Number(input.value || 0);
        });
        valueWrap.appendChild(input);
        if (def.unit) {
          const unit = document.createElement("span");
          unit.textContent = def.unit;
          valueWrap.appendChild(unit);
        }
        controls.appendChild(valueWrap);
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
          }, "bbt-add-button"),
        );
        controls.appendChild(wrapper);
        controls.appendChild(list);
        renderList(list, def);
      }

      row.appendChild(controls);
      section.appendChild(row);
    }

    panel.appendChild(section);
  }

  const buttons = document.createElement("div");
  buttons.className = "bbt-menu-buttons";
  buttons.appendChild(
    makeButton("读取", () => {
      draft = normalizeSettings(getSettings());
      closePanel();
      openSettingsPanel({ getSettings, setSettings, onSave });
    }, "bbt-secondary-button"),
  );
  buttons.appendChild(
    makeButton("保存", () => {
      const saved = setSettings(draft);
      draft = clone(saved);
      showPrompt("保存数据");
      onSave?.();
    }, "bbt-primary-button"),
  );
  buttons.appendChild(makeButton("关闭", closePanel, "bbt-secondary-button"));
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
    }, "bbt-secondary-button"),
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
    }, "bbt-secondary-button"),
  );
  buttons.appendChild(makeButton("作者", () => window.open("https://space.bilibili.com/351422438", "_blank"), "bbt-ghost-button"));
  buttons.appendChild(makeButton("赞助", () => window.open("https://afdian.com/a/tjxgame", "_blank"), "bbt-ghost-button"));
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
