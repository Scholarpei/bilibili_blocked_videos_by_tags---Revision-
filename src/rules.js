function isNonEmptyList(value) {
  return Array.isArray(value) && value.length > 0;
}

function textEquals(a = "", b = "") {
  return String(a).trim() === String(b).trim();
}

export function matchTextList(text, list, useRegex = false, flags = "") {
  if (!text || !isNonEmptyList(list)) return "";
  const source = String(text);

  for (const item of list) {
    const rule = String(item || "").trim();
    if (!rule) continue;

    if (useRegex) {
      try {
        if (new RegExp(rule, flags).test(source)) return rule;
      } catch {
        continue;
      }
    } else if (textEquals(source, rule)) {
      return rule;
    }
  }

  return "";
}

export function matchAnyTextList(values, list, useRegex = false, flags = "") {
  if (!isNonEmptyList(values) || !isNonEmptyList(list)) return { rule: "", value: "" };

  for (const item of list) {
    const rule = String(item || "").trim();
    if (!rule) continue;

    for (const value of values) {
      if (useRegex) {
        try {
          if (new RegExp(rule, flags).test(String(value))) return { rule, value };
        } catch {
          continue;
        }
      } else if (textEquals(value, rule)) {
        return { rule, value };
      }
    }
  }

  return { rule: "", value: "" };
}

function matchTagList(tags, list, useRegex) {
  if (!isNonEmptyList(tags) || !isNonEmptyList(list)) return { rule: "", value: "" };
  if (useRegex) return matchAnyTextList(tags, list, true, "i");

  for (const rule of list) {
    const normalizedRule = String(rule || "").trim().toLowerCase();
    if (!normalizedRule) continue;
    const hit = tags.find((tag) => String(tag || "").trim().toLowerCase() === normalizedRule);
    if (hit) return { rule, value: hit };
  }

  return { rule: "", value: "" };
}

function matchUpNameOrUid(video, settings) {
  const rules = settings.blockedNameOrUid_Array || [];
  if (!isNonEmptyList(rules)) return { rule: "", value: "" };

  for (const rule of rules) {
    const text = String(rule || "").trim();
    if (!text) continue;
    if (settings.blockedNameOrUid_UseRegular && video.upName) {
      try {
        if (new RegExp(text).test(String(video.upName))) return { rule: text, value: video.upName };
      } catch {
        continue;
      }
    } else if (video.upName == text) {
      return { rule: text, value: video.upName };
    }

    if (video.upUid != null && String(video.upUid) == text) {
      return { rule: text, value: String(video.upUid) };
    }
  }

  return { rule: "", value: "" };
}

function block(type, item) {
  return { blocked: true, type, item: String(item ?? "") };
}

function pass(extra = {}) {
  return { blocked: false, ...extra };
}

function isWhitelisted(video, settings) {
  if (!settings.whitelistNameOrUid_Switch || !isNonEmptyList(settings.whitelistNameOrUid_Array)) return false;
  const values = [video.upName, video.upUid].filter(Boolean);
  return Boolean(matchAnyTextList(values, settings.whitelistNameOrUid_Array, false).rule);
}

export function evaluateVideo(video, settings, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (isWhitelisted(video, settings)) return pass({ whitelisted: true });
  const favoriteCoinRatio =
    Number(video.favoriteCoinRatio || 0) ||
    (Number(video.coin || 0) > 0 ? Number((Number(video.favorite || 0) / Number(video.coin)).toFixed(2)) : 0);

  if (settings.blockedTitle_Switch && isNonEmptyList(settings.blockedTitle_Array)) {
    const match = matchTextList(video.title, settings.blockedTitle_Array, settings.blockedTitle_UseRegular);
    if (match) return block("按标题屏蔽", match);
  }

  if (settings.blockedNameOrUid_Switch && isNonEmptyList(settings.blockedNameOrUid_Array)) {
    const match = matchUpNameOrUid(video, settings);
    if (match.rule) return block("按UP主屏蔽", match.value || match.rule);
  }

  if (settings.blockedChargingExclusive_Switch && video.chargingExclusive) {
    return block("屏蔽充电专属视频", video.upName || video.upUid || "");
  }

  if (
    settings.blockedAboveFavoriteCoinRatio_Switch &&
    Number(settings.blockedAboveFavoriteCoinRatio) > 0 &&
    Number(video.view || 0) >= 5000 &&
    Number(video.favorite || 0) >= 50 &&
    Number(video.pubdate || 0) > 0 &&
    nowSeconds - Number(video.pubdate) > 7200 &&
    favoriteCoinRatio > Number(settings.blockedAboveFavoriteCoinRatio)
  ) {
    return block("屏蔽高收藏投币比", `${favoriteCoinRatio}`);
  }

  if (settings.blockedPortraitVideo_Switch && Number(video.width || 0) > 0 && Number(video.width) < Number(video.height || 0)) {
    return block("屏蔽竖屏视频", `${video.width} x ${video.height}`);
  }

  if (settings.blockedShortDuration_Switch && Number(settings.blockedShortDuration) > Number(video.duration || Infinity)) {
    return block("屏蔽低时长", `${video.duration || 0}秒`);
  }

  if (settings.blockedBelowVideoViews_Switch && Number(settings.blockedBelowVideoViews) > Number(video.view || Infinity)) {
    return block("屏蔽低播放量", `${video.view || 0}次`);
  }

  if (settings.blockedBelowLikesRate_Switch && Number(settings.blockedBelowLikesRate) > Number(video.likesRate || Infinity)) {
    return block("屏蔽低点赞率", `${video.likesRate || 0}%`);
  }

  if (settings.blockedBelowCoinRate_Switch && Number(settings.blockedBelowCoinRate) > Number(video.coinRate || Infinity)) {
    return block("屏蔽低投币率", `${video.coinRate || 0}%`);
  }

  if (settings.blockedBelowVideoFavorite_Switch && Number(settings.blockedBelowVideoFavorite) > Number(video.favorite || Infinity)) {
    return block("屏蔽低收藏数", `${video.favorite || 0}次收藏`);
  }

  if (settings.blockedVideoPartitions_Switch && isNonEmptyList(settings.blockedVideoPartitions_Array)) {
    const match = matchTextList(video.partition, settings.blockedVideoPartitions_Array, settings.blockedVideoPartitions_UseRegular);
    if (match) return block("按视频分区屏蔽", video.partition || match);
  }

  if (settings.blockedBelowUpLevel_Switch && Number(settings.blockedBelowUpLevel) > Number(video.upLevel || Infinity)) {
    return block("屏蔽低UP主等级", `${video.upLevel || 0}级`);
  }

  if (settings.blockedBelowUpFans_Switch && Number(settings.blockedBelowUpFans) > Number(video.upFans || Infinity)) {
    return block("屏蔽低UP主粉丝数", `${video.upFans || 0}人`);
  }

  if (settings.blockedAboveUpAttention_Switch && Number(settings.blockedAboveUpAttention) < Number(video.upAttention || 0)) {
    return block("屏蔽高UP主关注数", `${video.upAttention || 0}人`);
  }

  if (settings.blockedUpSigns_Switch && isNonEmptyList(settings.blockedUpSigns_Array)) {
    const match = matchTextList(video.upSign, settings.blockedUpSigns_Array, settings.blockedUpSigns_UseRegular);
    if (match) return block("按UP主简介屏蔽", match);
  }

  if (settings.blockedTag_Switch && isNonEmptyList(settings.blockedTag_Array)) {
    const match = matchTagList(video.tags || [], settings.blockedTag_Array, settings.blockedTag_UseRegular);
    if (match.rule) return block("按标签屏蔽", match.value || match.rule);
  }

  if (settings.doubleBlockedTag_Switch && isNonEmptyList(settings.doubleBlockedTag_Array) && isNonEmptyList(video.tags)) {
    for (const pair of settings.doubleBlockedTag_Array) {
      const [left, right] = String(pair).split("|").map((item) => item.trim());
      if (!left || !right) continue;
      const leftMatch = matchTagList(video.tags, [left], settings.doubleBlockedTag_UseRegular);
      const rightMatch = matchTagList(video.tags, [right], settings.doubleBlockedTag_UseRegular);
      if (leftMatch.rule && rightMatch.rule) {
        return block("按双重标签屏蔽", `${leftMatch.value || left},${rightMatch.value || right}`);
      }
    }
  }

  if (settings.blockedFilteredCommentsVideo_Switch && video.filteredComments) {
    return block("屏蔽精选评论的视频", video.upName || "");
  }

  if (settings.blockedTopComment_Switch && isNonEmptyList(settings.blockedTopComment_Array)) {
    const match = matchTextList(video.topComment, settings.blockedTopComment_Array, settings.blockedTopComment_UseRegular);
    if (match) return block("按置顶评论屏蔽", match);
  }

  return pass();
}

export function requiredDataGroups(settings) {
  return {
    video:
      settings.blockedBelowVideoFavorite_Switch ||
      settings.blockedChargingExclusive_Switch ||
      settings.blockedAboveFavoriteCoinRatio_Switch ||
      settings.blockedPortraitVideo_Switch ||
      settings.blockedShortDuration_Switch ||
      settings.blockedBelowVideoViews_Switch ||
      settings.blockedBelowLikesRate_Switch ||
      settings.blockedBelowCoinRate_Switch ||
      settings.blockedVideoPartitions_Switch,
    tags:
      (settings.blockedTag_Switch && isNonEmptyList(settings.blockedTag_Array)) ||
      (settings.doubleBlockedTag_Switch && isNonEmptyList(settings.doubleBlockedTag_Array)),
    up:
      settings.blockedBelowUpLevel_Switch ||
      settings.blockedBelowUpFans_Switch ||
      settings.blockedAboveUpAttention_Switch ||
      (settings.blockedUpSigns_Switch && isNonEmptyList(settings.blockedUpSigns_Array)),
    comments:
      settings.blockedFilteredCommentsVideo_Switch ||
      (settings.blockedTopComment_Switch && isNonEmptyList(settings.blockedTopComment_Array)),
  };
}
