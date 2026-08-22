import path from 'node:path';

interface ServiceOptions {
  name: string;
  description: string;
  script: string;
  scriptOptions?: string;
  workingDirectory: string;
  wait: number;
  grow: number;
  maxRetries: number;
}

interface WindowsService {
  on(event: string, listener: () => void): this;
  install(): void;
  uninstall(): void;
  start(): void;
  stop(): void;
}

interface NodeWindowsModule {
  Service: new (options: ServiceOptions) => WindowsService;
}

function quoteCommandLineArgument(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function createService(configPath: string): WindowsService {
  const nodeWindows = require('node-windows') as NodeWindowsModule;

  return new nodeWindows.Service({
    name: process.env.SERVICE_NAME || 'Service-TC',
    description:
      process.env.SERVICE_DESCRIPTION ||
      'Daily exchange-rate synchronization service for SAP Service Layer.',
    script: path.resolve(__dirname, 'index.js'),
    scriptOptions: quoteCommandLineArgument(configPath),
    workingDirectory: path.resolve(__dirname, '..'),
    wait: 1,
    grow: 0.25,
    maxRetries: 40
  });
}

function ensureWindows(): void {
  if (process.platform !== 'win32') {
    throw new Error('Windows service commands can only run on Windows (win32).');
  }
}

function run(): void {
  ensureWindows();

  const action = (process.argv[2] || 'install').toLowerCase();
  const configPath = path.resolve(
    process.cwd(),
    process.argv[3] || path.resolve(__dirname, '..', '..', 'config.json')
  );
  const service = createService(configPath);

  service.on('error', () => {
    console.error('[Service-TC] Service operation failed.');
  });

  switch (action) {
    case 'install':
      service.on('install', () => {
        console.log('[Service-TC] Service installed. Starting now...');
        service.start();
      });
      service.on('alreadyinstalled', () => {
        console.log('[Service-TC] Service is already installed.');
      });
      service.install();
      break;

    case 'uninstall':
      service.on('uninstall', () => {
        console.log('[Service-TC] Service uninstalled.');
      });
      service.on('alreadyuninstalled', () => {
        console.log('[Service-TC] Service is already uninstalled.');
      });
      service.uninstall();
      break;

    case 'start':
      service.start();
      console.log('[Service-TC] Start requested.');
      break;

    case 'stop':
      service.stop();
      console.log('[Service-TC] Stop requested.');
      break;

    case 'restart':
      service.on('stop', () => {
        service.start();
        console.log('[Service-TC] Restart requested.');
      });
      service.stop();
      break;

    default:
      throw new Error(
        `Unknown action "${action}". Use one of: install, start, stop, restart, uninstall.`
      );
  }
}

run();
