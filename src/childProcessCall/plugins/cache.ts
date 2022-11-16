/*
 * Filename: https://github.com/ccagml/vscode-leetcode-problem-rating/src/childProcessCall/plugins/cache.ts
 * Path: https://github.com/ccagml/vscode-leetcode-problem-rating
 * Created Date: Thursday, October 27th 2022, 7:43:29 pm
 * Author: ccagml
 *
 * Copyright (c) 2022 ccagml . All rights reserved.
 */

import { MyPluginBase } from "../my_plugin_base";

let underscore = require("underscore");

import { storageUtils } from "../storageUtils";
import { helper } from "../helper";
// import { log } from "../log";
import { session } from "../session";

class CachePlugin extends MyPluginBase {
  id = 50;
  name = "cache";
  builtin = true;
  constructor() {
    super();
  }

  clearCacheIfTchanged = (needTranslation) => {
    const translationConfig = storageUtils.getCache(helper.KEYS.translation);
    if (
      !translationConfig ||
      translationConfig["useEndpointTranslation"] != needTranslation
    ) {
      storageUtils.deleteAllCache();
      storageUtils.setCache(helper.KEYS.translation, {
        useEndpointTranslation: needTranslation,
      });
    }
  };

  public getProblems = (needTranslation, cb) => {
    this.clearCacheIfTchanged(needTranslation);
    const problems = storageUtils.getCache(helper.KEYS.problems);
    if (problems) {
      return cb(null, problems);
    }
    this.next.getProblems(needTranslation, function (e, problems) {
      if (e) return cb(e);
      storageUtils.setCache(helper.KEYS.problems, problems);
      return cb(null, problems);
    });
  };

  /**
   * getRatingOnline
   */
  public getRatingOnline = (cb) => {
    const cacheRantingData = storageUtils.getCache(helper.KEYS.ranting_path);
    if (cacheRantingData) {
      return cb(null, cacheRantingData);
    }
    this.next.getRatingOnline(function (e, ratingData) {
      if (e) return cb(e);
      let ratingObj;
      try {
        ratingObj = JSON.parse(ratingData);
      } catch (error) {
        return cb("JSON.parse(ratingData) error");
      }
      storageUtils.setCache(helper.KEYS.ranting_path, ratingObj);
      return cb(null, ratingObj);
    });
  };

  public getProblem = (problem, needTranslation, cb) => {
    this.clearCacheIfTchanged(needTranslation);
    const k = helper.KEYS.problem(problem);
    const _problem = storageUtils.getCache(k);
    let that = this;
    if (_problem) {
      if (!_problem.desc.includes("<pre>")) {
        //
      } else if (!["likes", "dislikes"].every((p) => p in _problem)) {
        //
      } else {
        underscore.extendOwn(problem, _problem);
        return cb(null, problem);
      }
    }
    this.next.getProblem(problem, needTranslation, function (e, _problem) {
      if (e) return cb(e);

      that.saveProblem(_problem);
      return cb(null, _problem);
    });
  };

  saveProblem = (problem) => {
    const _problem = underscore.omit(problem, ["locked", "state", "starred"]);
    return storageUtils.setCache(helper.KEYS.problem(problem), _problem);
  };

  updateProblem = (problem, kv) => {
    const problems = storageUtils.getCache(helper.KEYS.problems);
    if (!problems) return false;

    const _problem = problems.find((x) => x.id === problem.id);
    if (!_problem) return false;

    underscore.extend(_problem, kv);
    return storageUtils.setCache(helper.KEYS.problems, problems);
  };

  login = (user, cb) => {
    this.logout(user, false);
    this.next.login(user, function (e, user) {
      if (e) return cb(e);
      session.saveUser(user);
      return cb(null, user);
    });
  };

  logout = (user, purge) => {
    if (!user) user = session.getUser();
    if (purge) session.deleteUser();
    // NOTE: need invalidate any user related cache
    session.deleteCodingSession();
    return user;
  };
}

export const pluginObj: CachePlugin = new CachePlugin();
