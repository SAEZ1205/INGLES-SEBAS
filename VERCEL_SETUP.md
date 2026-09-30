# Vercel setup — Inglés Sebas v2

El APK v2 usa este backend por defecto:

`https://ingles-sebas-saez1205.vercel.app/api/ai`

## 1. Crear el proyecto
En Vercel: **Add New → Project → Import Git Repository** y elige:

`SAEZ1205/INGLES-SEBAS`

Usa exactamente este nombre de proyecto:

`ingles-sebas-saez1205`

Framework Preset: **Other**  
Root Directory: **./**

Haz el primer Deploy. Es normal que la IA todavía responda que falta configuración.

## 2. Añadir Gemini
En el proyecto:

**Settings → Environment Variables → Add New**

Nombre:

`GEMINI_API_KEY`

Valor: tu clave real de Google AI Studio.

Actívala al menos para **Production**. Puedes marcar también Preview y Development.

No pongas la clave en GitHub, index.html ni dentro del APK.

## 3. Redeploy
Ve a **Deployments**, abre el último deployment y elige **Redeploy** para que el deployment nuevo reciba la variable.

## 4. Comprobar
Abre:

`https://ingles-sebas-saez1205.vercel.app/api/ai`

Debe responder JSON con `"ok": true` y `"configured": true`.

Una vez hecho esto, el APK v2 ya puede usar Traductor y Buddy sin volver a meter la API en el celular.
