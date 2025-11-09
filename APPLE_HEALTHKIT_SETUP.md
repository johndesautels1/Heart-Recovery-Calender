# Apple HealthKit Integration Setup Guide

## Overview

Apple HealthKit integration requires **native iOS development** as it cannot be accessed via OAuth or web APIs. This guide provides step-by-step instructions for future clients to add HealthKit support to the Heart Recovery Calendar app.

---

## Prerequisites

- **iOS App**: React Native, Swift, or native iOS app
- **Apple Developer Account**: Required for HealthKit entitlement
- **Xcode**: Latest version
- **Physical iOS Device**: HealthKit doesn't work on simulator for all data types

---

## Step 1: Enable HealthKit Capability

### In Xcode:

1. Open your iOS project in Xcode
2. Select your app target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **HealthKit**
6. Check both boxes:
   - ✅ Clinical Health Records
   - ✅ HealthKit

### In `Info.plist`:

Add the following privacy descriptions:

```xml
<key>NSHealthShareUsageDescription</key>
<string>Heart Recovery Calendar needs access to your health data to monitor your cardiac recovery, track vital signs, and provide personalized health insights.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>Heart Recovery Calendar needs permission to save health data like workout sessions, heart rate measurements, and vital signs to your Health app.</string>

<key>NSHealthClinicalHealthRecordsShareUsageDescription</key>
<string>Heart Recovery Calendar needs access to your clinical health records to provide comprehensive cardiac care monitoring.</string>
```

---

## Step 2: Configure HealthKit Entitlements

### `YourApp.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
</dict>
</plist>
```

---

## Step 3: Request HealthKit Permissions (Swift)

### Create `HealthKitManager.swift`:

```swift
import HealthKit

class HealthKitManager {

    static let shared = HealthKitManager()
    private let healthStore = HKHealthStore()

    // Data types we want to read
    private let readDataTypes: Set<HKObjectType> = [
        // Vitals
        HKObjectType.quantityType(forIdentifier: .heartRate)!,
        HKObjectType.quantityType(forIdentifier: .bloodPressureSystolic)!,
        HKObjectType.quantityType(forIdentifier: .bloodPressureDiastolic)!,
        HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!,
        HKObjectType.quantityType(forIdentifier: .bodyTemperature)!,
        HKObjectType.quantityType(forIdentifier: .respiratoryRate)!,
        HKObjectType.quantityType(forIdentifier: .restingHeartRate)!,
        HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,

        // Exercise & Activity
        HKObjectType.workoutType(),
        HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
        HKObjectType.quantityType(forIdentifier: .stepCount)!,
        HKObjectType.quantityType(forIdentifier: .vo2Max)!,

        // ECG (if available)
        HKObjectType.electrocardiogramType(),

        // Spirometry
        HKObjectType.quantityType(forIdentifier: .forcedExpiratoryVolume1)!,
        HKObjectType.quantityType(forIdentifier: .forcedVitalCapacity)!,
        HKObjectType.quantityType(forIdentifier: .peakExpiratoryFlowRate)!,

        // Body Measurements
        HKObjectType.quantityType(forIdentifier: .bodyMass)!,
        HKObjectType.quantityType(forIdentifier: .height)!,
        HKObjectType.quantityType(forIdentifier: .bodyMassIndex)!,

        // Sleep
        HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
    ]

    // Data types we want to write (optional)
    private let writeDataTypes: Set<HKSampleType> = [
        HKObjectType.quantityType(forIdentifier: .heartRate)!,
        HKObjectType.quantityType(forIdentifier: .bloodPressureSystolic)!,
        HKObjectType.quantityType(forIdentifier: .bloodPressureDiastolic)!,
        HKObjectType.workoutType()
    ]

    // Check if HealthKit is available
    func isHealthDataAvailable() -> Bool {
        return HKHealthStore.isHealthDataAvailable()
    }

    // Request authorization
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard isHealthDataAvailable() else {
            completion(false, nil)
            return
        }

        healthStore.requestAuthorization(toShare: writeDataTypes, read: readDataTypes) { success, error in
            completion(success, error)
        }
    }
}
```

---

## Step 4: Query HealthKit Data

### Query Recent Heart Rate:

```swift
extension HealthKitManager {

    func fetchLatestHeartRate(completion: @escaping (Double?) -> Void) {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            completion(nil)
            return
        }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: heartRateType, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { _, samples, error in

            guard let sample = samples?.first as? HKQuantitySample else {
                completion(nil)
                return
            }

            let heartRate = sample.quantity.doubleValue(for: HKUnit(from: "count/min"))
            completion(heartRate)
        }

        healthStore.execute(query)
    }

    func fetchWorkouts(startDate: Date, endDate: Date, completion: @escaping ([HKWorkout]?) -> Void) {
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(sampleType: .workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sortDescriptor]) { _, samples, error in

            guard let workouts = samples as? [HKWorkout] else {
                completion(nil)
                return
            }

            completion(workouts)
        }

        healthStore.execute(query)
    }

    func fetchSpirometryData(completion: @escaping (Double?, Double?, Double?) -> Void) {
        let fev1Type = HKObjectType.quantityType(forIdentifier: .forcedExpiratoryVolume1)!
        let fvcType = HKObjectType.quantityType(forIdentifier: .forcedVitalCapacity)!
        let pefType = HKObjectType.quantityType(forIdentifier: .peakExpiratoryFlowRate)!

        let group = DispatchGroup()
        var fev1: Double?
        var fvc: Double?
        var pef: Double?

        // Query FEV1
        group.enter()
        let fev1Query = HKSampleQuery(sampleType: fev1Type, predicate: nil, limit: 1, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]) { _, samples, _ in
            if let sample = samples?.first as? HKQuantitySample {
                fev1 = sample.quantity.doubleValue(for: HKUnit.liter())
            }
            group.leave()
        }
        healthStore.execute(fev1Query)

        // Query FVC
        group.enter()
        let fvcQuery = HKSampleQuery(sampleType: fvcType, predicate: nil, limit: 1, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]) { _, samples, _ in
            if let sample = samples?.first as? HKQuantitySample {
                fvc = sample.quantity.doubleValue(for: HKUnit.liter())
            }
            group.leave()
        }
        healthStore.execute(fvcQuery)

        // Query PEF
        group.enter()
        let pefQuery = HKSampleQuery(sampleType: pefType, predicate: nil, limit: 1, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]) { _, samples, _ in
            if let sample = samples?.first as? HKQuantitySample {
                pef = sample.quantity.doubleValue(for: HKUnit(from: "L/min"))
            }
            group.leave()
        }
        healthStore.execute(pefQuery)

        group.notify(queue: .main) {
            completion(fev1, fvc, pef)
        }
    }
}
```

---

## Step 5: Stream Data to Backend

### Create `BackendSync.swift`:

```swift
import Foundation

class BackendSync {

    static let shared = BackendSync()
    private let baseURL = "http://localhost:4000/api"

    // Send exercise data to backend
    func syncExerciseData(workout: HKWorkout, heartRateData: [Double], completion: @escaping (Bool) -> Void) {

        let exerciseData: [String: Any] = [
            "source": "apple_health",
            "duration": workout.duration,
            "distance": workout.totalDistance?.doubleValue(for: .mile()) ?? 0,
            "calories": workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0,
            "workoutType": workout.workoutActivityType.rawValue,
            "startDate": ISO8601DateFormatter().string(from: workout.startDate),
            "endDate": ISO8601DateFormatter().string(from: workout.endDate),
            "heartRate": heartRateData.last ?? 0,
            "avgHeartRate": heartRateData.reduce(0, +) / Double(heartRateData.count),
            "maxHeartRate": heartRateData.max() ?? 0
        ]

        sendToBackend(endpoint: "/exercise-update", data: exerciseData, completion: completion)
    }

    // Send spirometry data to backend
    func syncSpirometryData(fev1: Double, fvc: Double, pef: Double, completion: @escaping (Bool) -> Void) {

        let spirometryData: [String: Any] = [
            "source": "apple_health",
            "device": "iPhone Spirometer",
            "fev1": fev1,
            "fvc": fvc,
            "pef": pef,
            "fev1FvcRatio": fev1 / fvc,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]

        sendToBackend(endpoint: "/spirometry-update", data: spirometryData, completion: completion)
    }

    // Send vitals data to backend
    func syncVitalsData(heartRate: Double, bloodPressure: (systolic: Double, diastolic: Double)?, o2Sat: Double?, temp: Double?, completion: @escaping (Bool) -> Void) {

        var vitalsData: [String: Any] = [
            "source": "apple_health",
            "heartRate": heartRate,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]

        if let bp = bloodPressure {
            vitalsData["bloodPressureSystolic"] = bp.systolic
            vitalsData["bloodPressureDiastolic"] = bp.diastolic
        }

        if let o2 = o2Sat {
            vitalsData["oxygenSaturation"] = o2
        }

        if let temperature = temp {
            vitalsData["temperature"] = temperature
        }

        sendToBackend(endpoint: "/vitals", data: vitalsData, completion: completion)
    }

    // Generic backend POST method
    private func sendToBackend(endpoint: String, data: [String: Any], completion: @escaping (Bool) -> Void) {

        guard let url = URL(string: baseURL + endpoint) else {
            completion(false)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add JWT token from keychain/userdefaults
        if let token = UserDefaults.standard.string(forKey: "jwt_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: data)
        } catch {
            completion(false)
            return
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let httpResponse = response as? HTTPURLResponse {
                completion(httpResponse.statusCode == 200 || httpResponse.statusCode == 201)
            } else {
                completion(false)
            }
        }.resume()
    }
}
```

---

## Step 6: Set Up Background Delivery (Optional)

### Enable real-time updates:

```swift
extension HealthKitManager {

    func enableBackgroundDelivery() {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else { return }

        let query = HKObserverQuery(sampleType: heartRateType, predicate: nil) { query, completionHandler, error in

            // Fetch new data and send to backend
            self.fetchLatestHeartRate { heartRate in
                if let hr = heartRate {
                    BackendSync.shared.syncVitalsData(heartRate: hr, bloodPressure: nil, o2Sat: nil, temp: nil) { success in
                        print("Background sync: \(success ? "Success" : "Failed")")
                    }
                }
            }

            completionHandler()
        }

        healthStore.execute(query)

        healthStore.enableBackgroundDelivery(for: heartRateType, frequency: .immediate) { success, error in
            print("Background delivery enabled: \(success)")
        }
    }
}
```

---

## Step 7: Initialize in App Delegate

### `AppDelegate.swift`:

```swift
import UIKit
import HealthKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // Request HealthKit permissions on app launch
        HealthKitManager.shared.requestAuthorization { success, error in
            if success {
                print("✅ HealthKit authorization granted")

                // Enable background delivery for real-time updates
                HealthKitManager.shared.enableBackgroundDelivery()
            } else {
                print("❌ HealthKit authorization denied: \(error?.localizedDescription ?? "Unknown error")")
            }
        }

        return true
    }
}
```

---

## Step 8: WebSocket Integration (Auto-Handled by Backend)

Once data is posted to:
- `POST /api/vitals` → Backend broadcasts via WebSocket `vitals-update`
- `POST /api/exercise-update` → Backend broadcasts via WebSocket `exercise-update`
- `POST /api/spirometry-update` → Backend broadcasts via WebSocket `spirometry-update`

**No additional frontend work needed** - the VitalsPage already listens to these WebSocket events!

---

## Testing Checklist

- [ ] HealthKit capability added in Xcode
- [ ] Privacy descriptions added to Info.plist
- [ ] Authorization request implemented
- [ ] Heart rate query working
- [ ] Workout query working
- [ ] Spirometry query working
- [ ] Data posting to backend successfully
- [ ] WebSocket updates appearing in VitalsPage
- [ ] Background delivery enabled (optional)
- [ ] Tested on physical iOS device

---

## Troubleshooting

### "HealthKit is not available"
- **Solution**: Test on a physical device, not simulator

### "Authorization denied"
- **Solution**: Check Info.plist privacy descriptions are present
- **Solution**: User must manually grant permission in Settings → Health → Data Access & Devices

### "Background delivery not working"
- **Solution**: Enable Background Modes → Background fetch in Xcode
- **Solution**: Test with phone locked/unlocked cycles

### "Data not syncing to backend"
- **Solution**: Check JWT token is valid
- **Solution**: Verify backend endpoints are running
- **Solution**: Check CORS settings allow iOS app origin

---

## Resources

- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [HKQuantityTypeIdentifier Reference](https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier)
- [HealthKit Sample Code](https://developer.apple.com/documentation/healthkit/samples)
- [Background Delivery Guide](https://developer.apple.com/documentation/healthkit/hkhealthstore/1614175-enablebackgrounddelivery)

---

## Future Enhancements

- **ECG Waveform Streaming**: Use `HKElectrocardiogramQuery` for Apple Watch ECG
- **Fall Detection**: Monitor `HKCategoryTypeIdentifier.appleWalkingSteadiness`
- **Medication Tracking**: Use `HKMedicationDoseEvent` (iOS 16+)
- **Heart Rate Recovery**: Calculate recovery metrics post-workout

---

**Backend is 100% ready** - Just add the iOS native code above! 🚀
