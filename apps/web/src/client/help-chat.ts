type HelpChatWindow = Window & {
  readonly HypertaskHelp?: {
    readonly open?: () => void;
  };
};

const helpChatWindow = () => {
  // SAFETY: the help widget adds HypertaskHelp to the page window after it loads.
  return window as HelpChatWindow;
};

const openHelpChat = () => {
  if (typeof helpChatWindow().HypertaskHelp?.open === "function") {
    helpChatWindow().HypertaskHelp?.open?.();

    return true;
  }

  const launcher = document.getElementById("chat-widget-btn");

  if (launcher !== null && launcher.style.display !== "none") {
    launcher.click();

    return true;
  }

  return false;
};

const clickedAskHelp = (event: Event) => {
  const target = event.target;

  return (
    target instanceof Element && target.closest("[data-ask-help]") !== null
  );
};

export const bindHelpChat = () => {
  document.addEventListener("keydown", (event) => {
    if (!event.metaKey || event.key.toLowerCase() !== "i") {
      return;
    }

    const link = document.querySelector("[data-ask-help]");

    if (link instanceof HTMLElement) {
      event.preventDefault();
      link.click();
    }
  });

  document.addEventListener("click", (event) => {
    if (clickedAskHelp(event) && openHelpChat()) {
      event.preventDefault();
    }
  });
};
