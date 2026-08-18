import SwiftUI

struct LoginView: View {
    @Environment(SessionModel.self) private var session

    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Email", text: $email)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    SecureField("Password", text: $password)
                        .textContentType(.password)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button {
                        Task { await signIn() }
                    } label: {
                        HStack {
                            Spacer()
                            if isSubmitting {
                                ProgressView()
                            } else {
                                Text("Sign In")
                            }
                            Spacer()
                        }
                    }
                    .disabled(!canSubmit)
                }
            }
            .navigationTitle("ShopKeeper")
        }
    }

    private var canSubmit: Bool {
        !email.isEmpty && !password.isEmpty && !isSubmitting
    }

    private func signIn() async {
        isSubmitting = true
        errorMessage = nil

        do {
            try await session.signIn(email: email, password: password)
        } catch {
            errorMessage = "Couldn't sign in. Check your email and password and try again."
        }

        isSubmitting = false
    }
}

#Preview {
    LoginView()
        .environment(SessionModel())
}
