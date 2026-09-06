export type WidgetLocale = "pt-BR" | "en";

const STRINGS = {
  "pt-BR": {
    talkToUs: "Conversar conosco",
    hello: "Olá! 👋",
    howCanWeHelp: "Como podemos ajudar?",
    startConversation: "Iniciar conversa",
    yourName: "Seu nome",
    yourEmail: "Seu e-mail",
    continue: "Continuar",
    writeMessage: "Escreva sua mensagem...",
    send: "Enviar",
    noMessages: "Nenhuma mensagem ainda. Diga oi! 👋",
    rateService: "Como foi seu atendimento?",
    rate: "Avaliar",
    notNow: "Agora não",
    couldNotLoad: "Não foi possível carregar o atendimento.",
    identifyError: "Erro ao identificar",
    startError: "Erro ao iniciar conversa",
    prechatError: "Erro no pré-atendimento",
    sendError: "Falha ao enviar",
    rateError: "Falha ao avaliar",
  },
  en: {
    talkToUs: "Chat with us",
    hello: "Hi! 👋",
    howCanWeHelp: "How can we help?",
    startConversation: "Start conversation",
    yourName: "Your name",
    yourEmail: "Your email",
    continue: "Continue",
    writeMessage: "Type your message...",
    send: "Send",
    noMessages: "No messages yet. Say hi! 👋",
    rateService: "How was your experience?",
    rate: "Rate",
    notNow: "Not now",
    couldNotLoad: "Could not load support.",
    identifyError: "Identification error",
    startError: "Could not start conversation",
    prechatError: "Pre-chat error",
    sendError: "Failed to send",
    rateError: "Failed to submit rating",
  },
} as const;

export type WidgetStrings = { [K in keyof (typeof STRINGS)["pt-BR"]]: string };

export function stringsFor(locale: string | undefined): WidgetStrings {
  const normalized = (locale ?? "").toLowerCase();
  if (normalized.startsWith("en")) return STRINGS.en;
  return STRINGS["pt-BR"];
}
