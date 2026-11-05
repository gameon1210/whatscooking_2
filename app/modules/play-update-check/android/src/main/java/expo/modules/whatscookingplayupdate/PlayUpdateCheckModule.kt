package expo.modules.whatscookingplayupdate

import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PlayUpdateCheckModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WhatsCookingPlayUpdate")

    AsyncFunction("availableVersionCode") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_PLAY_UPDATE", "The app is not ready to check for updates.", null)
      } else {
        AppUpdateManagerFactory.create(context).appUpdateInfo
          .addOnSuccessListener { info ->
            val version = if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE) {
              info.availableVersionCode()
            } else {
              null
            }
            promise.resolve(version)
          }
          .addOnFailureListener { error ->
            promise.reject("ERR_PLAY_UPDATE", "Google Play could not check for an update.", error)
          }
      }
    }
  }
}
