import { rimraf } from 'rimraf';

async function main() {
    try {
        await rimraf('dist');
    } catch (error) {
        console.error('Failed to clean build output:', error);
        process.exitCode = 1;
    }
}

main();
