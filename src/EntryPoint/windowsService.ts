import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

interface ServiceOptions {
  name: string;
  description: string;
  script: string;
  execPath?: string;
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isPackaged(): boolean {
  return 'pkg' in process;
}

function getDeploymentDirectory(): string {
  return isPackaged() ? path.dirname(process.execPath) : path.resolve(__dirname, '..', '..');
}

function getConfigPath(): string {
  const deploymentDirectory = getDeploymentDirectory();
  const configuredPath = process.argv[3];
  return configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : path.resolve(deploymentDirectory, 'config.json');
}

function getServiceId(): string {
  return (process.env.SERVICE_NAME || 'Service-TC').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function getWinSwSource(fileName: string): string {
  return path.resolve(__dirname, '..', '..', 'node_modules', 'node-windows', 'bin', 'winsw', fileName);
}

function createPackagedService(configPath: string): void {
  const deploymentDirectory = getDeploymentDirectory();
  const serviceId = getServiceId();
  const serviceExecutable = path.resolve(deploymentDirectory, `${serviceId}.exe`);
  const serviceConfig = path.resolve(deploymentDirectory, `${serviceId}.xml`);
  const workerPath = path.resolve(deploymentDirectory, 'Service-TC.exe');

  fs.copyFileSync(getWinSwSource('winsw.exe'), serviceExecutable);
  fs.copyFileSync(getWinSwSource('winsw.exe.config'), `${serviceExecutable}.config`);
  fs.writeFileSync(
    serviceConfig,
    `<service>\n  <id>${escapeXml(serviceId)}</id>\n  <name>${escapeXml(process.env.SERVICE_NAME || 'Service-TC')}</name>\n  <description>${escapeXml(process.env.SERVICE_DESCRIPTION || 'Daily exchange-rate synchronization service for SAP Service Layer.')}</description>\n  <executable>${escapeXml(workerPath)}</executable>\n  <arguments>${escapeXml(quoteCommandLineArgument(configPath))}</arguments>\n  <workingdirectory>${escapeXml(deploymentDirectory)}</workingdirectory>\n  <log mode="roll" />\n</service>\n`,
    'utf8'
  );

  execFileSync(serviceExecutable, ['install'], { cwd: deploymentDirectory, stdio: 'inherit' });
  execFileSync(serviceExecutable, ['start'], { cwd: deploymentDirectory, stdio: 'inherit' });
  console.log('[Service-TC] Service installed and started.');
}

function managePackagedService(action: string): void {
  const deploymentDirectory = getDeploymentDirectory();
  const serviceExecutable = path.resolve(deploymentDirectory, `${getServiceId()}.exe`);
  execFileSync(serviceExecutable, [action], { cwd: deploymentDirectory, stdio: 'inherit' });
  console.log(`[Service-TC] ${action} requested.`);
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
    workingDirectory: path.resolve(__dirname, '..', '..'),
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
  const configPath = getConfigPath();

  if (isPackaged()) {
    if (action === 'install') {
      createPackagedService(configPath);
    } else {
      managePackagedService(action);
    }
    return;
  }

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
