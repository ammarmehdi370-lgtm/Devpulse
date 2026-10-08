#!/usr/bin/env bash
set -u

echo "Your local IP addresses:"
echo

case "$(uname -s 2>/dev/null || echo unknown)" in
  Darwin)
    ifconfig | awk '/inet / && $2 != "127.0.0.1" { print "  " $2 }'
    ;;
  Linux)
    if command -v ip >/dev/null 2>&1; then
      ip -o -4 addr show scope global |
        awk '{ split($4, address, "/"); print "  " address[1] }'
    elif command -v hostname >/dev/null 2>&1; then
      hostname -I | tr ' ' '\n' | awk 'NF && $0 != "127.0.0.1" { print "  " $0 }'
    else
      echo "  Could not find an IP utility; use ipconfig/ifconfig."
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    ipconfig | awk -F: '/IPv4 Address/ {
      sub(/\(.*/, "", $2)
      gsub(/[[:space:]]/, "", $2)
      if ($2 != "" && $2 !~ /^127\./) print "  " $2
    }'
    ;;
  *)
    echo "  Unsupported shell; find your IPv4 address with ipconfig or ifconfig."
    ;;
esac

echo
echo "Set these in apps/mobile/.env (replace <IP> with an address above):"
echo "  EXPO_PUBLIC_API_URL=http://<IP>:4000"
echo "  EXPO_PUBLIC_SOCKET_URL=http://<IP>:4001"
echo "  EXPO_PUBLIC_AI_URL=http://<IP>:4002"
