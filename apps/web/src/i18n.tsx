import type { LocalizedText, Locale } from '@enlazia/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const es = {
  'app.tagline': 'Conecta IAs y APIs desde un solo lugar',
  'nav.dashboard': 'Inicio',
  'nav.catalog': 'Catálogo',
  'nav.connections': 'Conexiones',
  'nav.playground': 'Playground',
  'nav.logs': 'Registros',
  'nav.settings': 'Ajustes',
  'nav.menu': 'Abrir menú',
  'nav.madeBy': 'Hecho por',
  'nav.main': 'Navegación principal',

  'common.close': 'Cerrar',
  'common.cancel': 'Cancelar',
  'common.save': 'Guardar',
  'common.delete': 'Eliminar',
  'common.edit': 'Editar',
  'common.test': 'Probar',
  'common.retry': 'Reintentar',
  'common.refresh': 'Actualizar',
  'common.loading': 'Cargando…',
  'common.docs': 'Documentación',
  'common.all': 'Todos',

  'demo.banner': 'Estás viendo la demo pública: puedes explorar el catálogo, pero guardar credenciales está desactivado. Instala Enlazia para usarlo completo.',
  'theme.label': 'Tema',
  'theme.dark': 'Oscuro',
  'theme.light': 'Claro',
  'theme.system': 'Sistema',
  'lang.label': 'Idioma',

  'login.title': 'Inicia sesión',
  'login.subtitle': 'Esta instancia de Enlazia está protegida con contraseña.',
  'login.password': 'Contraseña',
  'login.submit': 'Entrar',

  'dashboard.title': 'Bienvenido a Enlazia',
  'dashboard.subtitle': 'Tu panel para conectar proveedores de IA y APIs de terceros, con tus credenciales cifradas en tu propio servidor.',
  'dashboard.stats.connections': 'Conexiones',
  'dashboard.stats.calls': 'Llamadas (24 h)',
  'dashboard.stats.errors': 'Errores (24 h)',
  'dashboard.stats.connectors': 'Conectores disponibles',
  'dashboard.quick.title': 'Primeros pasos',
  'dashboard.quick.step1.title': 'Elige un conector',
  'dashboard.quick.step1.desc': 'Explora el catálogo de IAs y APIs.',
  'dashboard.quick.step2.title': 'Agrega tu credencial',
  'dashboard.quick.step2.desc': 'Se guarda cifrada y nunca vuelve al navegador.',
  'dashboard.quick.step3.title': 'Pruébalo en el Playground',
  'dashboard.quick.step3.desc': 'Chatea con modelos o lanza peticiones REST.',
  'dashboard.activity.title': 'Actividad reciente',
  'dashboard.activity.empty': 'Aún no hay actividad. Cuando pruebes una conexión aparecerá aquí.',
  'dashboard.activity.viewAll': 'Ver todos los registros',

  'catalog.title': 'Catálogo',
  'catalog.subtitle': 'Conectores listos para usar. Cada uno es un archivo JSON: la comunidad puede agregar más.',
  'catalog.search': 'Buscar conectores',
  'catalog.filter.ai': 'IA',
  'catalog.filter.api': 'APIs',
  'catalog.connect': 'Conectar',
  'catalog.connected': '{count} conectada(s)',
  'catalog.empty': 'Ningún conector coincide con tu búsqueda.',
  'catalog.contribute': 'Crear un conector',
  'catalog.kind.ai-openai-compatible': 'Compatible con OpenAI',
  'catalog.kind.ai-anthropic': 'API de Anthropic',
  'catalog.kind.ai-gemini': 'API de Gemini',
  'catalog.kind.rest': 'API REST',

  'connect.titleNew': 'Conectar {name}',
  'connect.titleEdit': 'Editar {name}',
  'connect.name': 'Nombre de la conexión',
  'connect.nameHelp': 'Para identificarla, por ejemplo «OpenAI personal».',
  'connect.secretKept': 'Guardada. Déjala vacía para conservarla.',
  'connect.showSecret': 'Mostrar valor',
  'connect.hideSecret': 'Ocultar valor',
  'connect.saveAndTest': 'Guardar y probar',
  'connect.testing': 'Probando conexión…',
  'connect.testOk': 'Conexión exitosa: {message}',
  'connect.testFail': 'Se guardó, pero la prueba falló: {message}',
  'connect.done': 'Listo',
  'connect.getKey': '¿Dónde obtengo mis credenciales?',
  'connect.encrypted': 'Las credenciales se cifran con AES-256-GCM en tu servidor.',

  'connections.title': 'Conexiones',
  'connections.subtitle': 'Tus credenciales guardadas. Pruébalas, edítalas o úsalas en el Playground.',
  'connections.add': 'Nueva conexión',
  'connections.empty.title': 'Todavía no tienes conexiones',
  'connections.empty.desc': 'Elige un proveedor de IA o una API del catálogo y agrega tu credencial.',
  'connections.empty.action': 'Ir al catálogo',
  'connections.status.ok': 'Funciona',
  'connections.status.fail': 'Con error',
  'connections.status.untested': 'Sin probar',
  'connections.testedAt': 'Probada {time}',
  'connections.use': 'Usar',
  'connections.deleteTitle': 'Eliminar conexión',
  'connections.deleteConfirm': '¿Eliminar «{name}»? Se borrarán sus credenciales guardadas. Esta acción no se puede deshacer.',
  'connections.missingConnector': 'Conector no instalado',

  'playground.title': 'Playground',
  'playground.subtitle': 'Prueba tus conexiones: chatea con modelos de IA o envía peticiones a APIs.',
  'playground.connection': 'Conexión',
  'playground.noConnections': 'Crea una conexión para usar el Playground.',
  'playground.model': 'Modelo',
  'playground.modelPlaceholder': 'Escribe o elige un modelo',
  'playground.loadingModels': 'Cargando modelos…',
  'playground.system': 'Instrucciones del sistema',
  'playground.systemPlaceholder': 'Opcional. Ej.: Responde siempre en español y de forma breve.',
  'playground.temperature': 'Temperatura',
  'playground.chat.placeholder': 'Escribe un mensaje…',
  'playground.chat.send': 'Enviar',
  'playground.chat.stop': 'Detener',
  'playground.chat.clear': 'Limpiar chat',
  'playground.chat.empty': 'Envía un mensaje para empezar.',
  'playground.chat.hint': 'Enter para enviar · Shift + Enter para nueva línea',
  'playground.you': 'Tú',
  'playground.assistant': 'Asistente',
  'playground.rest.action': 'Acción',
  'playground.rest.custom': 'Petición personalizada',
  'playground.rest.method': 'Método',
  'playground.rest.path': 'Ruta',
  'playground.rest.body': 'Cuerpo (JSON)',
  'playground.rest.send': 'Enviar petición',
  'playground.rest.response': 'Respuesta',
  'playground.rest.headers': 'Encabezados',
  'playground.rest.empty': 'La respuesta aparecerá aquí.',

  'logs.title': 'Registros',
  'logs.subtitle': 'Últimas peticiones hechas por Enlazia. Las credenciales se ocultan.',
  'logs.empty': 'Aún no hay registros.',
  'logs.col.time': 'Fecha',
  'logs.col.connection': 'Conexión',
  'logs.col.kind': 'Tipo',
  'logs.col.request': 'Petición',
  'logs.col.status': 'Estado',
  'logs.col.duration': 'Duración',
  'logs.kind.test': 'Prueba',
  'logs.kind.models': 'Modelos',
  'logs.kind.chat': 'Chat',
  'logs.kind.request': 'Petición',
  'logs.deleted': 'Eliminada',

  'settings.title': 'Ajustes',
  'settings.subtitle': 'Preferencias de la interfaz e información de esta instancia.',
  'settings.appearance': 'Apariencia',
  'settings.instance': 'Instancia',
  'settings.version': 'Versión',
  'settings.mode': 'Modo',
  'settings.mode.demo': 'Demo pública',
  'settings.mode.normal': 'Autoalojado',
  'settings.auth': 'Contraseña de acceso',
  'settings.auth.on': 'Activada',
  'settings.auth.off': 'Desactivada (solo local)',
  'settings.logout': 'Cerrar sesión',
  'settings.connectorErrors': 'Conectores con errores',
  'settings.connectorErrorsNone': 'Todos los conectores se cargaron correctamente.',
  'settings.about': 'Acerca de',
  'settings.aboutText': 'Enlazia es un proyecto de código abierto para la comunidad, creado para conectar cualquier IA o API desde una interfaz simple y bilingüe.',
  'settings.author': 'Autor',
  'settings.repo': 'Repositorio',
  'settings.license': 'Licencia',
  'settings.contribute': 'Guía para contribuir',
} as const;

export type MessageKey = keyof typeof es;

const en: Record<MessageKey, string> = {
  'app.tagline': 'Connect AI and APIs from one place',
  'nav.dashboard': 'Home',
  'nav.catalog': 'Catalog',
  'nav.connections': 'Connections',
  'nav.playground': 'Playground',
  'nav.logs': 'Logs',
  'nav.settings': 'Settings',
  'nav.menu': 'Open menu',
  'nav.madeBy': 'Made by',
  'nav.main': 'Main navigation',

  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.test': 'Test',
  'common.retry': 'Retry',
  'common.refresh': 'Refresh',
  'common.loading': 'Loading…',
  'common.docs': 'Docs',
  'common.all': 'All',

  'demo.banner': 'You are viewing the public demo: browse the catalog freely, but saving credentials is disabled. Install Enlazia to use everything.',
  'theme.label': 'Theme',
  'theme.dark': 'Dark',
  'theme.light': 'Light',
  'theme.system': 'System',
  'lang.label': 'Language',

  'login.title': 'Sign in',
  'login.subtitle': 'This Enlazia instance is password protected.',
  'login.password': 'Password',
  'login.submit': 'Sign in',

  'dashboard.title': 'Welcome to Enlazia',
  'dashboard.subtitle': 'Your panel to connect AI providers and third-party APIs, with credentials encrypted on your own server.',
  'dashboard.stats.connections': 'Connections',
  'dashboard.stats.calls': 'Calls (24 h)',
  'dashboard.stats.errors': 'Errors (24 h)',
  'dashboard.stats.connectors': 'Available connectors',
  'dashboard.quick.title': 'Getting started',
  'dashboard.quick.step1.title': 'Pick a connector',
  'dashboard.quick.step1.desc': 'Browse the catalog of AI and APIs.',
  'dashboard.quick.step2.title': 'Add your credential',
  'dashboard.quick.step2.desc': 'It is stored encrypted and never sent back to the browser.',
  'dashboard.quick.step3.title': 'Try it in the Playground',
  'dashboard.quick.step3.desc': 'Chat with models or send REST requests.',
  'dashboard.activity.title': 'Recent activity',
  'dashboard.activity.empty': 'No activity yet. Test a connection and it will show up here.',
  'dashboard.activity.viewAll': 'View all logs',

  'catalog.title': 'Catalog',
  'catalog.subtitle': 'Ready-to-use connectors. Each one is a JSON file, so the community can add more.',
  'catalog.search': 'Search connectors',
  'catalog.filter.ai': 'AI',
  'catalog.filter.api': 'APIs',
  'catalog.connect': 'Connect',
  'catalog.connected': '{count} connected',
  'catalog.empty': 'No connector matches your search.',
  'catalog.contribute': 'Build a connector',
  'catalog.kind.ai-openai-compatible': 'OpenAI compatible',
  'catalog.kind.ai-anthropic': 'Anthropic API',
  'catalog.kind.ai-gemini': 'Gemini API',
  'catalog.kind.rest': 'REST API',

  'connect.titleNew': 'Connect {name}',
  'connect.titleEdit': 'Edit {name}',
  'connect.name': 'Connection name',
  'connect.nameHelp': 'To tell it apart, e.g. “Personal OpenAI”.',
  'connect.secretKept': 'Saved. Leave empty to keep it.',
  'connect.showSecret': 'Show value',
  'connect.hideSecret': 'Hide value',
  'connect.saveAndTest': 'Save and test',
  'connect.testing': 'Testing connection…',
  'connect.testOk': 'Connected: {message}',
  'connect.testFail': 'Saved, but the test failed: {message}',
  'connect.done': 'Done',
  'connect.getKey': 'Where do I get my credentials?',
  'connect.encrypted': 'Credentials are encrypted with AES-256-GCM on your server.',

  'connections.title': 'Connections',
  'connections.subtitle': 'Your saved credentials. Test them, edit them or use them in the Playground.',
  'connections.add': 'New connection',
  'connections.empty.title': 'No connections yet',
  'connections.empty.desc': 'Pick an AI provider or an API from the catalog and add your credential.',
  'connections.empty.action': 'Go to catalog',
  'connections.status.ok': 'Working',
  'connections.status.fail': 'Failing',
  'connections.status.untested': 'Untested',
  'connections.testedAt': 'Tested {time}',
  'connections.use': 'Use',
  'connections.deleteTitle': 'Delete connection',
  'connections.deleteConfirm': 'Delete “{name}”? Its stored credentials will be erased. This cannot be undone.',
  'connections.missingConnector': 'Connector not installed',

  'playground.title': 'Playground',
  'playground.subtitle': 'Try your connections: chat with AI models or send requests to APIs.',
  'playground.connection': 'Connection',
  'playground.noConnections': 'Create a connection to use the Playground.',
  'playground.model': 'Model',
  'playground.modelPlaceholder': 'Type or pick a model',
  'playground.loadingModels': 'Loading models…',
  'playground.system': 'System instructions',
  'playground.systemPlaceholder': 'Optional. E.g.: Always answer briefly.',
  'playground.temperature': 'Temperature',
  'playground.chat.placeholder': 'Write a message…',
  'playground.chat.send': 'Send',
  'playground.chat.stop': 'Stop',
  'playground.chat.clear': 'Clear chat',
  'playground.chat.empty': 'Send a message to start.',
  'playground.chat.hint': 'Enter to send · Shift + Enter for a new line',
  'playground.you': 'You',
  'playground.assistant': 'Assistant',
  'playground.rest.action': 'Action',
  'playground.rest.custom': 'Custom request',
  'playground.rest.method': 'Method',
  'playground.rest.path': 'Path',
  'playground.rest.body': 'Body (JSON)',
  'playground.rest.send': 'Send request',
  'playground.rest.response': 'Response',
  'playground.rest.headers': 'Headers',
  'playground.rest.empty': 'The response will show up here.',

  'logs.title': 'Logs',
  'logs.subtitle': 'Latest requests made by Enlazia. Credentials are hidden.',
  'logs.empty': 'No logs yet.',
  'logs.col.time': 'Date',
  'logs.col.connection': 'Connection',
  'logs.col.kind': 'Type',
  'logs.col.request': 'Request',
  'logs.col.status': 'Status',
  'logs.col.duration': 'Duration',
  'logs.kind.test': 'Test',
  'logs.kind.models': 'Models',
  'logs.kind.chat': 'Chat',
  'logs.kind.request': 'Request',
  'logs.deleted': 'Deleted',

  'settings.title': 'Settings',
  'settings.subtitle': 'Interface preferences and information about this instance.',
  'settings.appearance': 'Appearance',
  'settings.instance': 'Instance',
  'settings.version': 'Version',
  'settings.mode': 'Mode',
  'settings.mode.demo': 'Public demo',
  'settings.mode.normal': 'Self-hosted',
  'settings.auth': 'Access password',
  'settings.auth.on': 'Enabled',
  'settings.auth.off': 'Disabled (local only)',
  'settings.logout': 'Sign out',
  'settings.connectorErrors': 'Connectors with errors',
  'settings.connectorErrorsNone': 'All connectors loaded correctly.',
  'settings.about': 'About',
  'settings.aboutText': 'Enlazia is an open-source community project to connect any AI or API from a simple, bilingual interface.',
  'settings.author': 'Author',
  'settings.repo': 'Repository',
  'settings.license': 'License',
  'settings.contribute': 'Contributing guide',
};

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { es, en };
const STORAGE_KEY = 'enlazia.locale';

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  lt: (text: LocalizedText) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'es' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => {
        let message = MESSAGES[locale][key];
        for (const [name, v] of Object.entries(vars ?? {})) message = message.replaceAll(`{${name}}`, String(v));
        return message;
      },
      lt: (text) => text[locale],
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
