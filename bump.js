#!/usr/bin/env node
/**
 * BlackHat Pro — Project CLI
 * Usage:
 *   node bump.js version          → bumps patch (0.0.3 → 0.0.4)
 *   node bump.js version minor    → bumps minor (0.0.3 → 0.1.0)
 *   node bump.js version major    → bumps major (0.0.3 → 1.0.0)
 *   node bump.js name "New Name"  → renames app in config.xml + manifest
 *   node bump.js id "com.you.app" → changes app bundle ID
 *   node bump.js info             → shows current version, name, id
 *   node bump.js reset            → resets version to 0.0.1
 */

const fs = require('fs');
const path = require('path');

const CONFIG_XML = path.join(__dirname, 'config.xml');
const MANIFEST   = path.join(__dirname, 'www', 'manifest.json');

// ── helpers ──────────────────────────────────────────────────────────────────

function readConfig() {
    if (!fs.existsSync(CONFIG_XML)) { console.error('❌ config.xml not found'); process.exit(1); }
    return fs.readFileSync(CONFIG_XML, 'utf8');
}

function writeConfig(content) {
    fs.writeFileSync(CONFIG_XML, content, 'utf8');
}

function readManifest() {
    if (!fs.existsSync(MANIFEST)) return null;
    try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); }
    catch(e) { return null; }
}

function writeManifest(obj) {
    if (!fs.existsSync(MANIFEST)) return;
    fs.writeFileSync(MANIFEST, JSON.stringify(obj, null, 4), 'utf8');
}

// anchored to <widget so it never touches <?xml version="1.0" ?>
function getVersion(config) {
    const match = config.match(/<widget[^>]*\sversion=['"]([^'"]+)['"]/);
    return match ? match[1] : null;
}

function getName(config) {
    const match = config.match(/<name>([^<]+)<\/name>/);
    return match ? match[1].trim() : null;
}

function getId(config) {
    const match = config.match(/<widget[^>]*\sid=['"]([^'"]+)['"]/);
    return match ? match[1] : null;
}

function setVersion(config, next) {
    // only replaces version inside <widget ...> tag, not XML declaration
    return config.replace(/(<widget[^>]*\sversion=['"])[^'"]+(['"])/, `$1${next}$2`);
}

function setName(config, newName) {
    return config.replace(/<name>[^<]+<\/name>/, `<name>${newName}</name>`);
}

function setId(config, newId) {
    return config.replace(/(<widget[^>]*\sid=['"])[^'"]+(['"])/, `$1${newId}$2`);
}

function bumpVersion(version, type) {
    let [major, minor, patch] = version.split('.').map(Number);
    if (type === 'major') {
        major++; minor = 0; patch = 0;
    } else if (type === 'minor') {
        minor++; patch = 0;
    } else {
        patch++;
        if (patch > 9) { patch = 0; minor++; }
        if (minor > 9) { minor = 0; major++; }
    }
    return `${major}.${minor}.${patch}`;
}

function colorize(str, code) { return `\x1b[${code}m${str}\x1b[0m`; }
const green  = s => colorize(s, 32);
const yellow = s => colorize(s, 33);
const cyan   = s => colorize(s, 36);
const bold   = s => colorize(s, 1);
const dim    = s => colorize(s, 2);
const red    = s => colorize(s, 31);

// ── commands ─────────────────────────────────────────────────────────────────

const commands = {

    version(type = 'patch') {
        if (!['patch','minor','major'].includes(type)) {
            console.error(`${red('❌')} Unknown bump type: ${type}. Use patch, minor, or major.`);
            process.exit(1);
        }

        const config  = readConfig();
        const current = getVersion(config);
        if (!current) { console.error(`${red('❌')} Could not find version in <widget> tag`); process.exit(1); }

        const next    = bumpVersion(current, type);
        writeConfig(setVersion(config, next));

        const manifest = readManifest();
        if (manifest) { manifest.version = next; writeManifest(manifest); }

        console.log(`${green('✓')} Version bumped ${dim(`(${type})`)}: ${yellow(current)} → ${bold(green(next))}`);
    },

    name(newName) {
        if (!newName) { console.error(`${red('❌')} Usage: node bump.js name "New Name"`); process.exit(1); }

        const config = readConfig();
        const old    = getName(config);
        writeConfig(setName(config, newName));

        const manifest = readManifest();
        if (manifest) {
            manifest.name       = newName;
            manifest.short_name = newName.split(' ')[0];
            writeManifest(manifest);
        }

        console.log(`${green('✓')} Name changed: ${yellow(old)} → ${bold(green(newName))}`);
    },

    id(newId) {
        if (!newId) { console.error(`${red('❌')} Usage: node bump.js id "com.you.app"`); process.exit(1); }

        const config = readConfig();
        const old    = getId(config);
        writeConfig(setId(config, newId));

        console.log(`${green('✓')} Bundle ID changed: ${yellow(old)} → ${bold(green(newId))}`);
    },

    info() {
        const config  = readConfig();
        const version = getVersion(config);
        const name    = getName(config);
        const id      = getId(config);
        const manifest = readManifest();

        console.log('');
        console.log(bold(cyan('  BlackHat Pro — Project Info')));
        console.log(dim('  ──────────────────────────────────'));
        console.log(`  ${dim('Name:')}      ${bold(name)}`);
        console.log(`  ${dim('Version:')}   ${bold(yellow(version))}`);
        console.log(`  ${dim('Bundle ID:')} ${id}`);
        if (manifest) {
        console.log(`  ${dim('PWA Name:')}  ${manifest.name}`);
        }
        console.log('');
    },

    reset() {
        const config = readConfig();
        const old    = getVersion(config);
        writeConfig(setVersion(config, '0.0.1'));

        const manifest = readManifest();
        if (manifest) { manifest.version = '0.0.1'; writeManifest(manifest); }

        console.log(`${green('✓')} Version reset: ${yellow(old)} → ${bold(green('0.0.1'))}`);
    },

    help() {
        console.log('');
        console.log(bold(cyan('  BlackHat Pro CLI')));
        console.log(dim('  ──────────────────────────────────────────────'));
        console.log(`  ${bold('node bump.js version')}           bump patch  0.0.3 → 0.0.4`);
        console.log(`  ${bold('node bump.js version minor')}     bump minor  0.0.3 → 0.1.0`);
        console.log(`  ${bold('node bump.js version major')}     bump major  0.0.3 → 1.0.0`);
        console.log(`  ${bold('node bump.js name "New Name"')}   rename app everywhere`);
        console.log(`  ${bold('node bump.js id "com.x.app"')}    change bundle ID`);
        console.log(`  ${bold('node bump.js info')}              show current project info`);
        console.log(`  ${bold('node bump.js reset')}             reset version to 0.0.1`);
        console.log('');
    }

};

// ── main ─────────────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    commands.help();
} else if (commands[cmd]) {
    commands[cmd](...args);
} else {
    console.error(`${red('❌')} Unknown command: ${bold(cmd)}`);
    commands.help();
    process.exit(1);
}