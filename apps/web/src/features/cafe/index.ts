import { Submodel } from "foldkit";
import type { Html } from "foldkit/html";

import type { CafeMessage } from "../../client/cafe/message.js";
import { Model } from "../../client/cafe/model.js";
import type { CafeModel } from "../../client/cafe/model.js";
import { siteBasePath, siteBuilder } from "../../site-base.js";
import * as AllStars from "./all-stars.js";
import * as Directory from "./directory.js";
import * as News from "./news.js";

export {
  allStarsRouter,
  directoryRouter,
  newsFeedRouter,
  newsRouter,
} from "../site-route.js";

export const view = Submodel.defineView<CafeModel, CafeMessage>((model, h) =>
  Model.match<Html>(model, {
    AllStars: (allStars) =>
      AllStars.view(allStars, siteBuilder(siteBasePath, h)),
    Directory: (directory) =>
      Directory.view(directory, siteBuilder(siteBasePath, h)),
    News: (news) => News.view(news, siteBuilder(siteBasePath, h)),
  })
);
