# VPS Deployment

Deploy Beboa on a Virtual Private Server for full control.

## Requirements

- VPS with Ubuntu 22.04+ (or similar)
- SSH access
- Node.js 20+
- Git

## Step 1: Server Setup

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js

```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20.x.x
npm --version
```

### Install Build Dependencies

For `better-sqlite3`:
```bash
sudo apt install -y build-essential python3
```

### Create Bot User (Optional)

```bash
sudo useradd -m -s /bin/bash beboa
sudo su - beboa
```

## Step 2: Clone Repository

```bash
cd ~
git clone https://github.com/CMLKevin/beboa_evo.git
cd beboa_evo
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Configure Environment

```bash
cp .env.example .env
nano .env
```

Add your configuration:
```env
DISCORD_TOKEN=your_token
CLIENT_ID=your_client_id
# ... rest of config
```

## Step 5: Test Run

```bash
npm start
```

Verify bot comes online, then Ctrl+C to stop.

## Step 6: Set Up Process Manager

### Using PM2 (Recommended)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start bot
pm2 start src/index.js --name beboa

# Configure startup
pm2 startup
pm2 save

# View logs
pm2 logs beboa

# Restart
pm2 restart beboa

# Stop
pm2 stop beboa
```

### PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'beboa',
    script: 'src/index.js',
    cwd: '/home/beboa/beboa_evo',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Then:
```bash
pm2 start ecosystem.config.js
```

### Using systemd

Create `/etc/systemd/system/beboa.service`:

```ini
[Unit]
Description=Beboa Discord Bot
After=network.target

[Service]
Type=simple
User=beboa
WorkingDirectory=/home/beboa/beboa_evo
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=beboa

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable beboa
sudo systemctl start beboa

# Check status
sudo systemctl status beboa

# View logs
sudo journalctl -u beboa -f
```

## Updating the Bot

### With PM2

```bash
cd ~/beboa_evo
git pull
npm install
pm2 restart beboa
```

### With systemd

```bash
cd ~/beboa_evo
git pull
npm install
sudo systemctl restart beboa
```

### Auto-Update Script

Create `update.sh`:

```bash
#!/bin/bash
cd /home/beboa/beboa_evo
git pull
npm install
pm2 restart beboa
echo "Updated at $(date)"
```

Make executable:
```bash
chmod +x update.sh
```

## Monitoring

### PM2 Monitoring

```bash
# Real-time monitor
pm2 monit

# Status
pm2 status

# Logs
pm2 logs beboa --lines 100
```

### System Resources

```bash
# CPU/Memory
htop

# Disk
df -h

# Network
nethogs
```

## Backup

### Database Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/beboa/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /home/beboa/beboa_evo/data/beboa.db "$BACKUP_DIR/beboa_$DATE.db"

# Keep only last 7 days
find $BACKUP_DIR -name "beboa_*.db" -mtime +7 -delete
```

Add to cron:
```bash
crontab -e
# Add:
0 0 * * * /home/beboa/backup.sh
```

## Security

### Firewall

```bash
sudo ufw allow ssh
sudo ufw enable
# Discord bot doesn't need incoming ports
```

### File Permissions

```bash
chmod 600 .env
chmod 644 package.json
chmod 755 src/
```

### Fail2ban (Optional)

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

## Troubleshooting

### Bot Won't Start

Check logs:
```bash
pm2 logs beboa --lines 50
# or
journalctl -u beboa -n 50
```

### Memory Issues

```bash
# Check memory
free -h

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### NPM Install Fails

```bash
# Clear cache
npm cache clean --force

# Try again with verbose
npm install --verbose
```

### better-sqlite3 Issues

```bash
# Rebuild native modules
npm rebuild better-sqlite3
```
