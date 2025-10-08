const { spawn } = require('child_process');

              function launch() {


   const child = spawn('node', ['src/index.js'], { stdio: 'inherit', shell: true });
     child.on('close', code => {
       if (code === 2) {
      console.log('Bot requested restart. Restarting...');
           launch();
     } else {
      process.exit(code);
    }
  });
}

launch();