#!/usr/bin/env bash
# Сборка FreeNeuro.apk без Gradle: aapt2 + javac + d8 + zipalign + apksigner
set -e
SDK=${ANDROID_SDK:-/opt/android-sdk}
BT=$SDK/build-tools/35.0.0
PLATFORM=$SDK/platforms/android-34/android.jar
cd "$(dirname "$0")"

rm -rf build && mkdir -p build/gen build/classes build/dex

echo ">> aapt2: ресурсы..."
$BT/aapt2 compile --dir res -o build/res.zip
$BT/aapt2 link -o build/base.apk -I "$PLATFORM" --manifest AndroidManifest.xml -R build/res.zip \
  --java build/gen --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 4 --version-name 1.3 --auto-add-overlay

echo ">> javac: компиляция..."
javac -source 1.8 -target 1.8 -nowarn -classpath "$PLATFORM" \
  -d build/classes src/ai/freeneuro/app/*.java 2>&1 | grep -v "bootstrap class path\|source/target" || true

echo ">> d8: dex..."
$BT/d8 --release --min-api 24 --output build/dex $(find build/classes -name '*.class')

echo ">> упаковка classes.dex..."
python3 - <<'PYDEX'
import zipfile
with zipfile.ZipFile("build/base.apk", "a", zipfile.ZIP_DEFLATED) as z:
    if "classes.dex" not in z.namelist():
        z.write("build/dex/classes.dex", "classes.dex")
print("dex вшит")
PYDEX

echo ">> zipalign + подпись..."
$BT/zipalign -f 4 build/base.apk build/aligned.apk
KS=freeneuro.keystore
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias freeneuro \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass freeneuro -keypass freeneuro \
    -dname "CN=FreeNeuro, OU=App, O=FreeNeuro, C=RU" -noprompt
fi
$BT/apksigner sign --ks "$KS" \
  --ks-pass pass:freeneuro --key-pass pass:freeneuro \
  --out /home/user/FreeNeuro.apk build/aligned.apk
$BT/apksigner verify /home/user/FreeNeuro.apk && echo "APK ГОТОВ: /home/user/FreeNeuro.apk"
