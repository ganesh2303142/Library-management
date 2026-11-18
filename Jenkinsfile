pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  triggers {
    githubPush()
    cron('H 2 * * *')
  }

  parameters {
    booleanParam(name: 'RUN_SMOKE_TEST', defaultValue: true, description: 'Start the app briefly and verify the health endpoint')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps {
        bat 'npm ci'
      }
    }

    stage('Test') {
      steps {
        bat 'npm test'
      }
    }

    stage('Build') {
      steps {
        bat 'if not exist build mkdir build'
        bat 'npm pack --pack-destination build'
      }
    }

    stage('Smoke Test') {
      when { expression { return params.RUN_SMOKE_TEST } }
      steps {
        bat '''
          set PORT=3100
          start "Library App" /B cmd /C "npm start"
          powershell -NoProfile -ExecutionPolicy Bypass -Command "$response = $null; for ($i=0; $i -lt 30; $i++) { try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:3100/api/health' -TimeoutSec 2; if ($response.status -eq 'ok') { exit 0 } } catch {} Start-Sleep -Seconds 1 }; exit 1"
        '''
      }
      post {
        always {
          bat 'taskkill /FI "WINDOWTITLE eq Library App*" /T /F'
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'build/*.tgz', allowEmptyArchive: true
      cleanWs()
    }
  }
}
