/**
 * 简化版构建脚本，只构建扩展部分，跳过 webview-ui 构建
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 确保 bin 目录存在
const binDir = path.join(__dirname, '..', 'bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

// 确保 out 目录存在
const outDir = path.join(__dirname, '..', 'out');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// 确保 webview-ui/build 目录存在
const webviewBuildDir = path.join(__dirname, '..', 'webview-ui', 'build');
if (!fs.existsSync(webviewBuildDir)) {
    fs.mkdirSync(webviewBuildDir, { recursive: true });
    
    // 创建一个简单的占位文件，以便打包时不会报错
    fs.writeFileSync(
        path.join(webviewBuildDir, 'index.html'), 
        '<html><body><div id="root">Placeholder</div></body></html>'
    );
    fs.writeFileSync(
        path.join(webviewBuildDir, 'assets'), 
        '// Placeholder'
    );
}

try {
    // 编译 TypeScript 文件
    console.log('编译 TypeScript 文件...');
    execSync('tsc -p . --outDir out', { stdio: 'inherit' });

    // 使用 esbuild 打包
    console.log('使用 esbuild 打包...');
    execSync('node esbuild.js --production', { stdio: 'inherit' });

    // 使用 vsce 打包
    console.log('打包 .vsix 文件...');
    execSync('pnpm vsce package --out bin', { stdio: 'inherit' });

    console.log('打包完成！VSIX 文件已生成在 bin 目录中。');
} catch (error) {
    console.error('打包过程中出错:', error.message);
    process.exit(1);
}
