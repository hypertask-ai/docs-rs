import { Runtime } from "foldkit";

import { installOverlay } from "#devtools-overlay";

import { view } from "../features/reader.js";
import { bindDocsContents } from "./docs-toc.js";
import { DocumentQueries } from "./docs/queries.js";
import { bindHelpChat } from "./help-chat.js";
import { browserInit } from "./reader/init.js";
import { Message } from "./reader/message.js";
import { Model, ReaderFlags } from "./reader/model.js";
import { subscriptions } from "./reader/subscriptions.js";
import { update } from "./reader/update.js";

import "../../../site/src/rat.css";
import "./reader.css";
import "../docs.css";

const application = Runtime.makeApplication({
  Flags: ReaderFlags,
  Model,
  container: document.querySelector("#root"),
  devTools: import.meta.env.DEV ? { Message } : false,
  init: browserInit,
  resources: DocumentQueries.layer,
  subscriptions,
  update,
  view,
});

installOverlay();

bindHelpChat();

bindDocsContents();

Runtime.hydrate(application);
