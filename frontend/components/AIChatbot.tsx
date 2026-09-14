"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Globe,
  Volume2,
  VolumeX,
  RotateCcw,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type Language = "en" | "hi" | "mr" | "ta" | "te" | "bn" | "gu" | "kn";

interface LanguageOption {
  code: Language;
  label: string;
  native: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", native: "English", flag: "🇮🇳" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "mr", label: "Marathi", native: "मराठी", flag: "🇮🇳" },
  { code: "ta", label: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "te", label: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { code: "bn", label: "Bengali", native: "বাংলা", flag: "🇮🇳" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
];

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  suggestedAction?: { label: string; href: string };
}

const UI_TEXT: Record<Language, { title: string; subtitle: string; placeholder: string; disclaimer: string; prompts: string[] }> = {
  en: {
    title: "Scheme Assistant AI",
    subtitle: "Ask in any language about welfare schemes & eligibility",
    placeholder: "Type your query (e.g. Am I eligible for PM-Kisan?)...",
    disclaimer: "AI Assistant provides instant guidance based on official scheme rules.",
    prompts: [
      "Am I eligible for PM-Kisan?",
      "What documents are required for housing?",
      "How to track my application?",
      "Find scholarship schemes for students",
    ],
  },
  hi: {
    title: "योजना सहायक एआई",
    subtitle: "कल्याणकारी योजनाओं और पात्रता के बारे में किसी भी भाषा में पूछें",
    placeholder: "अपना प्रश्न लिखें (उदा. क्या मैं पीएम-किसान के लिए पात्र हूँ?)...",
    disclaimer: "एआई सहायक आधिकारिक योजना मानदंडों के आधार पर त्वरित सहायता प्रदान करता है।",
    prompts: [
      "क्या मैं पीएम-किसान के लिए पात्र हूँ?",
      "आवास योजना के लिए कौन से दस्तावेज चाहिए?",
      "आवेदन की स्थिति कैसे ट्रैक करें?",
      "छात्रों के लिए छात्रवृत्ति योजनाएं खोजें",
    ],
  },
  mr: {
    title: "योजना सहाय्यक AI",
    subtitle: "कल्याणकारी योजना आणि पात्रतेबद्दल कोणत्याही भाषेत विचारा",
    placeholder: "तुमचा प्रश्न टाइप करा (उदा. मी पीएम-किसानसाठी पात्र आहे का?)...",
    disclaimer: "AI सहाय्यक अधिकृत योजना निकषांवर आधारित त्वरित मार्गदर्शन प्रदान करतो.",
    prompts: [
      "मी पीएम-किसानसाठी पात्र आहे का?",
      "घरकुल योजनेसाठी कोणती कागदपत्रे लागतील?",
      "माझ्या अर्जाची स्थिती कशी तपासायची?",
      "विद्यार्थ्यांसाठी शिष्यवृत्ती योजना शोधा",
    ],
  },
  ta: {
    title: "திட்ட உதவியாளர் AI",
    subtitle: "நலத்திட்டங்கள் மற்றும் தகுதிகள் பற்றி எந்த மொழியிலும் கேளுங்கள்",
    placeholder: "உங்கள் கேள்வியை தட்டச்சு செய்க...",
    disclaimer: "AI உதவியாளர் அதிகாரப்பூர்வ திட்ட அளவுகோல்களின் அடிப்படையில் வழிகாட்டுகிறது.",
    prompts: [
      "நான் பிஎம்-கிசான் திட்டத்திற்கு தகுதியுடையவனா?",
      "வீட்டு வசதி திட்டத்திற்கு என்ன ஆவணங்கள் தேவை?",
      "விண்ணப்ப நிலையை எவ்வாறு கண்காணிப்பது?",
      "மாணவர்களுக்கான உதவித்தொகை திட்டங்கள்",
    ],
  },
  te: {
    title: "పథకం సహాయకుడు AI",
    subtitle: "సంక్షేమ పథకాలు & అర్హత గురించి ఏ భాషలోనైనా అడగండి",
    placeholder: "మీ ప్రశ్నను టైప్ చేయండి...",
    disclaimer: "AI సహాయకుడు అధికారిక పథకం నిబంధనల ఆధారంగా మార్గదర్శకత్వం అందిస్తుంది.",
    prompts: [
      "నేను పిఎమ్-కిసాన్‌కు అర్హుడినా?",
      "గృహ నిర్మాణానికి ఏ పత్రాలు అవసరం?",
      "అప్లికేషన్ స్థితిని ఎలా తనిఖీ చేయాలి?",
      "విద్యార్థుల స్కాలర్‌షిప్ పథకాలు",
    ],
  },
  bn: {
    title: "স্কিম অ্যাসিস্ট্যান্ট AI",
    subtitle: "যেকোনো ভাষায় কল্যাণমূলক প্রকল্প এবং যোগ্যতা সম্পর্কে জিজ্ঞাসা করুন",
    placeholder: "আপনার প্রশ্ন টাইপ করুন...",
    disclaimer: "AI অ্যাসিস্ট্যান্ট সরকারি স্কিমের মানদণ্ডের ভিত্তিতে দ্রুত সহায়তা প্রদান করে।",
    prompts: [
      "আমি কি পিএম-কিসানের জন্য যোগ্য?",
      "আবাসন প্রকল্পের জন্য কী কী নথি প্রয়োজন?",
      "আবেদন ট্র্যাক করবেন কীভাবে?",
      "ছাত্রদের স্কলারশিপ স্কিম খুঁজুন",
    ],
  },
  gu: {
    title: "યોજના સહાયક AI",
    subtitle: "કલ્યાણકારી યોજનાઓ અને પાત્રતા વિશે કોઈપણ ભાષામાં પૂછો",
    placeholder: "તમારો પ્રશ્ન ટાઈપ કરો...",
    disclaimer: "AI સહાયક સત્તાવાર યોજનાના ધોરણો પર આધારિત માહિતી આપે છે.",
    prompts: [
      "શું હું પીએમ-કિસાન માટે પાત્ર છું?",
      "આવાસ યોજના માટે કયા દસ્તાવેજો જોઈએ?",
      "અરજીની સ્થિતિ કેવી રીતે ટ્રેક કરવી?",
      "વિદ્યાર્થીઓ માટે શિષ્યવૃત્તિ યોજનાઓ",
    ],
  },
  kn: {
    title: "ಯೋಜನಾ ಸಹಾಯಕ AI",
    subtitle: "ಕಲ್ಯಾಣ ಯೋಜನೆಗಳು ಮತ್ತು ಅರ್ಹತೆಯ ಬಗ್ಗೆ ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ",
    placeholder: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ...",
    disclaimer: "AI ಸಹಾಯಕ ಅಧಿಕೃತ ಯೋಜನಾ ಮಾನದಂಡಗಳ ಆಧಾರದ ಮೇಲೆ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತದೆ.",
    prompts: [
      "ನಾನು ಪಿಎಂ-ಕಿಸಾನ್‌ಗೆ ಅರ್ಹನೇ?",
      "ವಸತಿ ಯೋಜನೆಗೆ ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?",
      "ಅರ್ಜಿ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸುವುದು ಹೇಗೆ?",
      "ವಿದ್ಯಾರ್ಥಿವೇತನ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ",
    ],
  },
};

function getBotResponse(userMsg: string, lang: Language): { text: string; action?: { label: string; href: string } } {
  const lower = userMsg.toLowerCase();

  // Housing / PM Awas
  if (lower.includes("awas") || lower.includes("housing") || lower.includes("घर") || lower.includes("வீடு") || lower.includes("ஆவாஸ்") || lower.includes("આવાસ") || lower.includes("ವಸತಿ")) {
    const textMap: Record<Language, string> = {
      en: "🏡 **PM Awas Yojana (Housing for All)**\n\n• **Eligibility**: Low-income families (EWS/LIG) without a pucca house.\n• **Documents Needed**: Aadhaar Card, Income Certificate, Bank Account Details, Property/Land Records.\n• **Benefit**: Direct financial assistance up to ₹2.5 Lakhs.\n\nYou can submit an application directly under our Schemes tab!",
      hi: "🏡 **प्रधानमंत्री आवास योजना (सबके लिए आवास)**\n\n• **पात्रता**: कच्चे मकान वाले या बेघर निम्न आय वर्ग (EWS/LIG) परिवार।\n• **आवश्यक दस्तावेज**: आधार कार्ड, आय प्रमाण पत्र, बैंक पासबुक, संपत्ति रिकॉर्ड।\n• **लाभ**: ₹2.5 लाख तक की सीधी वित्तीय सहायता।\n\nआप हमारी 'योजनाएं' टैब से तुरंत आवेदन कर सकते हैं!",
      mr: "🏡 **पीएम आवास योजना (सर्वसमावेशक घरकुल)**\n\n• **पात्रता**: स्वतःचे पक्के घर नसलेले अल्प उत्पन्न कुटुंब (EWS/LIG).\n• **आवश्यक कागदपत्रे**: आधार कार्ड, उत्पन्नाचा दाखला, बँक पासबुक, जागेचा दाखला.\n• **लाभ**: ₹२.५ लाखांपर्यंत थेट आर्थिक मदत.",
      ta: "🏡 **பிரதம மந்திரி ஆவாஸ் யோஜனா (அனைவருக்கும் வீடு)**\n\n• **தகுதி**: சொந்தமாக பக்கா வீடு இல்லாத குறைந்த வருவாய் குடும்பங்கள்.\n• **தேவையான ஆவணங்கள்**: ஆதார் அட்டை, வருமான சான்றிதழ், வங்கி கணக்கு புத்தகம்.\n• **பயன்**: ₹2.5 லட்சம் வரை நேரடி நிதி உதவி.",
      te: "🏡 **పీఎం ఆవాస్ యోజన (అందరికీ ఇల్లు)**\n\n• **అర్హత**: పక్కా ఇల్లు లేని అల్ప ఆదాయ కుటుంబాలు.\n• **కావాల్సిన పత్రాలు**: ఆధార్ కార్డు, ఆదాయ ధృవీకరణ పత్రం, బ్యాంక్ పాస్‌బుక్.\n• **ప్రయోజనం**: ₹2.5 లక్షల వరకు ఆర్థిక సాయం.",
      bn: "🏡 **পিএম আবাসন যোজনা**\n\n• **যোগ্যতা**: নিজস্ব পাকা বাড়ি নেই এমন নিম্ন আয়ের পরিবার।\n• **নথি**: আধার কার্ড, আয়ের সংশাপত্র, ব্যাংক অ্যাকাউন্ট।\n• **সুবিধা**: ₹২.৫ লাখ পর্যন্ত আর্থিক সাহায্য।",
      gu: "🏡 **પીએમ આવાસ યોજના**\n\n• **પાત્રતા**: પાકું મકાન ન હોય તેવા નીચી આવક ધરાવતા પરિવારો.\n• **દસ્તાવેજો**: આધાર કાર્ડ, આવકનો દાખલો, બેંક પાસબુક.\n• **લાભ**: ₹2.5 લાખ સુધીની નાણાકીય સહાય.",
      kn: "🏡 **ಪಿಎಂ ಆವಾಸ್ ಯೋಜನೆ**\n\n• **ಅರ್ಹತೆ**: ಸ್ವಂತ ಪಕ್ಕಾ ಮನೆ ಇಲ್ಲದ ಕಡಿಮೆ ಆದಾಯದ ಕುಟುಂಬಗಳು.\n• **ದಾಖಲೆಗಳು**: ಆಧಾರ್ ಕಾರ್ಡ್, ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್.\n• **ಪ್ರಯೋಜನ**: ₹2.5 ಲಕ್ಷದವರೆಗೆ ಆರ್ಥಿಕ ನೆರವು.",
    };
    return { text: textMap[lang] || textMap.en, action: { label: "Apply for PM Awas", href: "/schemes" } };
  }

  // PM Kisan / Agriculture
  if (lower.includes("kisan") || lower.includes("farmer") || lower.includes("किसान") || lower.includes("शेतकरी") || lower.includes("விவசாயி") || lower.includes("రైతు") || lower.includes("কৃষক") || lower.includes("ખેડૂત")) {
    const textMap: Record<Language, string> = {
      en: "🌾 **PM-Kisan Samman Nidhi**\n\n• **Eligibility**: Small & marginal farmer families owning cultivable land.\n• **Benefit**: ₹6,000 per year transferred directly to bank account in 3 equal installments.\n• **Documents Needed**: Land Ownership papers (7/12, Khatauni), Aadhaar Card, Bank Account linked to Aadhaar.",
      hi: "🌾 **पीएम-किसान सम्मान निधि**\n\n• **पात्रता**: कृषि योग्य भूमि वाले छोटे और सीमांत किसान परिवार।\n• **लाभ**: 3 समान किस्तों में बैंक खाते में ₹6,000 प्रति वर्ष सीधे हस्तांतरित।\n• **आवश्यक दस्तावेज**: खसरा/खतौनी जमीन के कागजात, आधार कार्ड, आधार से जुड़ा बैंक खाता।",
      mr: "🌾 **पीएम-किसान सन्मान निधी**\n\n• **पात्रता**: शेतजमीन असलेले लहान व अल्पभूधारक शेतकरी.\n• **लाभ**: दरवर्षी ₹६,००० थेट बँक खात्यात (३ हप्त्यांमध्ये).\n• **कागदपत्रे**: ७/१२ उतारा, आधार कार्ड, बँक पासबुक.",
      ta: "🌾 **பிஎம்-கிசான் சம்மான் நிதி**\n\n• **தகுதி**: விளைநிலம் வைத்துள்ள சிறு விவசாய குடும்பங்கள்.\n• **பயன்**: ஆண்டுக்கு ₹6,000 வங்கி கணக்கில் நேரடியாக செலுத்தப்படும்.\n• **ஆவணங்கள்**: நிலப் பட்டா, ஆதார் அட்டை, வங்கி கணக்கு.",
      te: "🌾 **పీఎం-కిసాన్ సమ్మాన్ నిధి**\n\n• **అర్హత**: సాగుభూమి ఉన్న చిన్న, సన్నకారు రైతులు.\n• **ప్రయోజనం**: సంవత్సరానికి ₹6,000 నేరుగా బ్యాంకు ఖాతాలో జమవుతుంది.\n• **పత్రాలు**: భూమి పట్టాదారు పాస్‌బుక్, ఆధార్ కార్డు, బ్యాంక్ ఖాతా.",
      bn: "🌾 **পিএম-কিসান সম্মান নিধি**\n\n• **যোগ্যতা**: কৃষি জমি থাকা ক্ষুদ্র ও প্রান্তিক কৃষক পরিবার।\n• **সুবিধা**: বছরে ₹৬,০০০ সোজাসুজি ব্যাংক অ্যাকাউন্টে।\n• **নথি**: জমির রেকর্ড, আধার কার্ড, ব্যাংক অ্যাকাউন্ট।",
      gu: "🌾 **પીએમ-કિસાન સન્માન નિધિ**\n\n• **પાત્રતા**: ખેતીલાયક જમીન ધરાવતા નાના ખેડૂતો.\n• **લાભ**: વાર્ષિક ₹6,000 સીધા બેંક ખાતામાં.\n• **દસ્તાવેજો**: જમીનના કાગળો (7/12), આધાર કાર્ડ, બેંક ખાતું.",
      kn: "🌾 **ಪಿಎಂ-ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ**\n\n• **ಅರ್ಹತೆ**: ಸಾಗುವಳಿ ಭೂಮಿ ಹೊಂದಿರುವ ಸಣ್ಣ ರೈತರು.\n• **ಪ್ರಯೋಜನ**: ವರ್ಷಕ್ಕೆ ₹6,000 ನೇರವಾಗಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ.\n• **ದಾಖಲೆಗಳು**: ಜಮೀನು ಪಹಣಿ (RTC), ಆಧಾರ್ ಕಾರ್ಡ್, ಬ್ಯಾಂಕ್ ಖಾತೆ.",
    };
    return { text: textMap[lang] || textMap.en, action: { label: "View PM-Kisan Scheme", href: "/schemes" } };
  }

  // Scholarship / Students
  if (lower.includes("scholarship") || lower.includes("student") || lower.includes("छात्र") || lower.includes("विद्यार्थी") || lower.includes("மாணவர்") || lower.includes("విద్యార్థి") || lower.includes("ছাত্র")) {
    const textMap: Record<Language, string> = {
      en: "🎓 **Post-Matric Scholarship Scheme**\n\n• **Eligibility**: Students pursuing Higher Secondary, Diploma, Degree, or PG courses with annual family income below ₹2.5 Lakhs.\n• **Benefit**: Full tuition fee reimbursement + monthly maintenance allowance.\n• **Documents Needed**: Marksheet, Income Certificate, Caste Certificate, Fee Receipt.",
      hi: "🎓 **पोस्ट-मैट्रिक छात्रवृत्ति योजना**\n\n• **पात्रता**: उच्चतर माध्यमिक, डिप्लोमा या डिग्री कर रहे छात्र जिनकी पारिवारिक वार्षिक आय ₹2.5 लाख से कम है।\n• **लाभ**: पूरी ट्यूशन फीस की वापसी + मासिक रखरखाव भत्ता।\n• **आवश्यक दस्तावेज**: अंकसूची, आय प्रमाण पत्र, जाति प्रमाण पत्र, फीस की रसीद।",
      mr: "🎓 **मॅट्रिकोत्तर शिष्यवृत्ती योजना**\n\n• **पात्रता**: पदवी/डिप्लोमा करणारे विद्यार्थी (वार्षिक उत्पन्न ₹२.५ लाखांपेक्षा कमी).\n• **लाभ**: पूर्ण शिक्षण शुल्क परतावा + मासिक भत्ता.",
      ta: "🎓 **மெட்ரிக் பிந்தைய உதவித்தொகை திட்டம்**\n\n• **தகுதி**: மேல்நிலைப் பள்ளி/கல்லூரி மாணவர்கள் (வருமானம் ₹2.5 லட்சத்திற்குள்).\n• **பயன்**: முழு கல்விக்கட்டணம் மற்றும் மாதாந்திர படித்தொகை.",
      te: "🎓 **పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్ పథకం**\n\n• **అర్హత**: కళాశాల/డిగ్రీ చదువుతున్న విద్యార్థులు (ఆదాయం ₹2.5 లక్షల లోపు).\n• **ప్రయోజనం**: పూర్తి ట్యూషన్ ఫీజు రీయింబర్స్‌మెంట్.",
      bn: "🎓 **পোস্ট-ম্যাট্রিক স্কলারশিপ**\n\n• **যোগ্যতা**: উচ্চশিক্ষার ছাত্রছাত্রী (বার্ষিক আয় ₹২.৫ লাখের কম)।\n• **সুবিধা**: সম্পূর্ণ কোর্স ফি মকুব ও মাসিক ভাতা।",
      gu: "🎓 **પોસ્ટ-મેટ્રિક શિષ્યવૃત્તિ યોજના**\n\n• **પાત્રતા**: ઉચ્ચ શિક્ષણ મેળવતા વિદ્યાર્થીઓ.\n• **લાભ**: ફ્રી શિપ કાર્ડ અને ફી રિઇમ્બર્સમેન્ટ.",
      kn: "🎓 **ಮೆಟ್ರಿಕ್ ನಂತರದ ವಿದ್ಯಾರ್ಥಿವೇತನ**\n\n• **ಅರ್ಹತೆ**: ಪದವಿ/ಡಿಪ್ಲೊಮಾ ವಿದ್ಯಾರ್ಥಿಗಳು (ಆದಾಯ ₹2.5 ಲಕ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ).\n• **ಪ್ರಯೋಜನ**: ಪೂರ್ಣ ಬೋಧನಾ ಶುಲ್ಕ ಮರುಪಾವತಿ.",
    };
    return { text: textMap[lang] || textMap.en, action: { label: "Explore Scholarships", href: "/schemes" } };
  }

  // Application Tracking / Status
  if (lower.includes("track") || lower.includes("status") || lower.includes("स्थिति") || lower.includes("अर्जाची") || lower.includes("நிலை") || lower.includes("స్థితి") || lower.includes("স্ট্যাটাস")) {
    const textMap: Record<Language, string> = {
      en: "📋 **How to Track Your Application Status**\n\n1. Login to your account using your phone or Aadhaar identifier.\n2. Click on **'My Applications'** in the top navigation bar.\n3. You will see real-time updates: **Pending Review**, **Approved**, or **Rejected** along with officer remarks and sanctioned benefit amounts.",
      hi: "📋 **अपने आवेदन की स्थिति कैसे जांचें**\n\n1. अपने फोन नंबर या आधार आईडी से लॉगिन करें।\n2. ऊपर नेविगेशन बार में **'मेरे आवेदन'** पर क्लिक करें।\n3. आपको वास्तविक समय अपडेट दिखाई देगा: **लंबित (Pending)**, **स्वीकृत (Approved)**, या **अस्वीकृत (Rejected)** अधिकारी की टिप्पणी के साथ।",
      mr: "📋 **अर्जाची स्थिती कशी तपासायची**\n\n1. तुमच्या खात्यात लॉगिन करा.\n2. मेनूमधील **'माझे अर्ज' (My Applications)** वर क्लिक करा.\n3. तुम्हाला थेट स्थिती (Pending / Approved / Rejected) दिसेल.",
      ta: "📋 **விண்ணப்ப நிலையை சரிபார்க்கும் முறை**\n\n1. உங்கள் கணக்கில் லாக் இன் செய்யவும்.\n2. **'என் விண்ணப்பங்கள்'** என்பதை கிளிக் செய்யவும்.\n3. உங்கள் விண்ணப்பத்தின் நிலையை உடனுக்குடன் காணலாம்.",
      te: "📋 **అప్లికేషన్ స్థితిని తనిఖీ చేసే విధానం**\n\n1. మీ ఖాతాలోకి లాగిన్ అవ్వండి.\n2. **'నా అప్లికేషన్లు'** పై క్లిక్ చేయండి.\n3. మీ దరఖాస్తు ప్రస్తుత స్థితిని చూడవచ్చు.",
      bn: "📋 **আবেদন ট্র্যাক করার উপায়**\n\n1. অ্যাকাউন্টে লগইন করুন।\n2. **'আমার আবেদন'** ট্যাবে ক্লিক করুন।\n3. আপনার আবেদনের বর্তমান স্ট্যাটাস দেখতে পাবেন।",
      gu: "📋 **અરજીની સ્થિતિ કેવી રીતે ટ્રેક કરવી**\n\n1. તમારા એકાઉન્ટમાં લોગિન કરો.\n2. **'મારી અરજીઓ'** પર ક્લિક કરો.\n3. તમને તાજી સ્થિતિ (Pending/Approved) જોવા મળશે.",
      kn: "📋 **ಅರ್ಜಿ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸುವುದು**\n\n1. ನಿಮ್ಮ ಖಾತೆಗೆ ಲಾಗ್ ಇನ್ ಮಾಡಿ.\n2. **'ನನ್ನ ಅರ್ಜಿಗಳು'** ಕ್ಲಿಕ್ ಮಾಡಿ.\n3. ನಿಮ್ಮ ಅರ್ಜಿಯ ಪ್ರಸ್ತುತ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.",
    };
    return { text: textMap[lang] || textMap.en, action: { label: "Go to My Applications", href: "/applications" } };
  }

  // Documents
  if (lower.includes("document") || lower.includes("paper") || lower.includes("दस्तावेज") || lower.includes("कागदपत्रे") || lower.includes("ஆவணங்கள்") || lower.includes("పత్రాలు") || lower.includes("নথি")) {
    const textMap: Record<Language, string> = {
      en: "📄 **General Documents Required for Most Welfare Schemes**\n\n1. **Identity Proof**: Aadhaar Card (Masked) / Voter ID / PAN Card\n2. **Address Proof**: Ration Card / Electricity Bill / Domicile Certificate\n3. **Financial Proof**: Income Certificate issued by Tahsildar & Active Bank Passbook\n4. **Passport Photo**: Clean scanned copy (PDF/JPEG up to 5MB)",
      hi: "📄 **अधिकांश कल्याणकारी योजनाओं के लिए आवश्यक सामान्य दस्तावेज**\n\n1. **पहचान प्रमाण**: आधार कार्ड (मास्क्ड) / मतदाता पहचान पत्र / पैन कार्ड\n2. **पता प्रमाण**: राशन कार्ड / बिजली बिल / मूल निवासी प्रमाण पत्र\n3. **वित्तीय प्रमाण**: तहसीलदार द्वारा जारी आय प्रमाण पत्र एवं सक्रिय बैंक पासबुक\n4. **पासपोर्ट फोटो**: साफ स्कैन की गई प्रति (PDF/JPEG अधिकतम 5MB)",
      mr: "📄 **आवश्यक सामान्य कागदपत्रे**\n\n1. **ओळख पुरावा**: आधार कार्ड / मतदार ओळखपत्र\n2. **रहिवासी दाखला**: रेशन कार्ड / वीज बिल / अधिवास प्रमाणपत्र\n3. **उत्पन्नाचा दाखला**: तहसीलदारांचा दाखला व बँक पासबुक.",
      ta: "📄 **தேவையான பொதுவான ஆவணங்கள்**\n\n1. **அடையாள சான்று**: ஆதார் அட்டை / வாக்காளர் அட்டை\n2. **முகவரி சான்று**: ரேஷன் கார்டு / குடும்ப அட்டை\n3. **வருமான சான்றிதழ்** மற்றும் வங்கி கணக்கு புத்தகம்.",
      te: "📄 **కావాల్సిన సాధారణ పత్రాలు**\n\n1. **గుర్తింపు కార్డు**: ఆధార్ కార్డు / ఓటర్ కార్డ్\n2. **చిరునామా ధృవీకరణ**: రేషన్ కార్డ్ / కరెంట్ బిల్లు\n3. **ఆదాయ ధృవీకరణ పత్రం** మరియు బ్యాంక్ పాస్‌బుక్.",
      bn: "📄 **প্রয়োজনীয় সাধারণ কাগজপত্র**\n\n1. **পরিচয়পত্র**: আধার কার্ড / ভোটার কার্ড\n2. **ঠিকানার প্রমাণ**: রেশন কার্ড / বাসস্থানের প্রশংসাপত্র\n3. **আয়ের সংশাপত্র** এবং ব্যাংক পাসবুক।",
      gu: "📄 **જરૂરી સામાન્ય દસ્તાવેજો**\n\n1. **ઓળખનો પુરાવો**: આધાર કાર્ડ / વોટર આઈડી\n2. **રહેઠાણનો પુરાવો**: રેશન કાર્ડ / લાઈટ બિલ\n3. **આવકનો દાખલો** અને બેંક પાસબુક.",
      kn: "📄 **ಅಗತ್ಯವಿರುವ ಸಾಮಾನ್ಯ ದಾಖಲೆಗಳು**\n\n1. **ಗುರುತಿನ ಚೀಟಿ**: ಆಧಾರ್ ಕಾರ್ಡ್ / ಮತದಾರರ ಚೀಟಿ\n2. **ವಿಳಾಸ ಪುರಾವೆ**: ರೇಷನ್ ಕಾರ್ಡ್ / ವಿದ್ಯುತ್ ಬಿಲ್\n3. **ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ** ಮತ್ತು ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್.",
    };
    return { text: textMap[lang] || textMap.en, action: { label: "Browse All Schemes", href: "/schemes" } };
  }

  // Default response
  const defaultText: Record<Language, string> = {
    en: "I am your Scheme Sync AI Assistant. I can help you with eligibility criteria, required documents, application process, and tracking for government schemes like PM Awas, PM-Kisan, Pensions, and Scholarships.\n\nHow may I assist you today?",
    hi: "मैं आपका योजना सिंक एआई सहायक हूँ। मैं आपको पीएम आवास, पीएम-किसान, पेंशन और छात्रवृत्ति जैसी सरकारी योजनाओं की पात्रता, आवश्यक दस्तावेज, आवेदन प्रक्रिया और ट्रैकिंग में मदद कर सकता हूँ।\n\nमैं आज आपकी क्या सहायता कर सकता हूँ?",
    mr: "मी तुमचा योजना सिंक AI सहाय्यक आहे. मी तुम्हाला पीएम आवास, पीएम-किसान, पेन्शन आणि शिष्यवृत्तीसारख्या सरकारी योजनांची माहिती, कागदपत्रे आणि अर्जाची स्थिती तपासण्यास मदत करू शकतो.\n\nमी तुम्हाला कशी मदत करू?",
    ta: "நான் உங்கள் திட்ட உதவி AI. அரசு நலத்திட்டங்களின் தகுதிகள், தேவையான ஆவணங்கள் மற்றும் விண்ணப்பிக்கும் முறை பற்றி உங்களுக்கு உதவ முடியும்.\n\nஇன்று உங்களுக்கு எவ்வாறு உதவட்டும்?",
    te: "నేను మీ పథకం సహాయక AI. ప్రభుత్వ సంక్షేమ పథకాల అర్హతలు, అవసరమైన పత్రాలు మరియు అప్లికేషన్ ప్రక్రియలో మీకు సహాయం చేయగలను.\n\nనేడు మీకు ఎలా సహాయపడాలి?",
    bn: "আমি আপনার স্কিম সিঙ্ক AI সহকারী। সরকারি বিভিন্ন প্রকল্পের যোগ্যতা, প্রয়োজনীয় কাগজপত্র এবং আবেদন প্রক্রিয়ার জন্য আমি আপনাকে সাহায্য করতে পারি।\n\nআপনাকে কীভাবে সাহায্য করতে পারি?",
    gu: "હું તમારો યોજના સિંક AI સહાયક છું. હું તમને સરકારી યોજનાઓની પાત્રતા, જરૂરી દસ્તાવેજો અને અરજી કરવામાં મદદ કરી શકું છું.\n\nહું તમને કેવી રીતે મદદ કરી શકું?",
    kn: "ನಾನು ನಿಮ್ಮ ಯೋಜನಾ ಸಿಂಕ್ AI ಸಹಾಯಕ. ಸರ್ಕಾರದ ಯೋಜನೆಗಳ ಅರ್ಹತೆ, ಅಗತ್ಯ ದಾಖಲೆಗಳು ಮತ್ತು ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿ ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.\n\nನಿಮಗೆ ಹೇಗೆ ನೆರವಾಗಲಿ?",
  };

  return { text: defaultText[lang] || defaultText.en };
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<Language>("en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close chatbot when user clicks/touches outside the widget
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const welcomeTexts: Record<Language, string> = {
      en: "Hello! 👋 I am your Scheme Assistant AI. How can I help you find or apply for government welfare schemes today?",
      hi: "नमस्ते! 👋 मैं आपका योजना सहायक एआई हूँ। आज मैं सरकारी योजनाओं को खोजने या आवेदन करने में आपकी क्या मदद कर सकता हूँ?",
      mr: "नमस्कार! 👋 मी तुमचा योजना सहाय्यक AI आहे. आज सरकारी योजना शोधण्यासाठी किंवा अर्ज करण्यासाठी मी तुम्हाला कशी मदत करू?",
      ta: "வணக்கம்! 👋 நான் உங்கள் திட்ட உதவியாளர் AI. அரசு நலத்திட்டங்களை கண்டறிய அல்லது விண்ணப்பிக்க இன்று உங்களுக்கு எவ்வாறு உதவட்டும்?",
      te: "నమస్కారం! 👋 నేను మీ పథకం సహాయకుడు AI. ప్రభుత్వ సంక్షేమ పథకాల గురించి మీకు ఎలా సహాయపడాలి?",
      bn: "নমস্কার! 👋 আমি আপনার স্কিম অ্যাসিস্ট্যান্ট AI। সরকারি প্রকল্প সম্পর্কে যেকোনো তথ্য জানতে আমাকে জিজ্ঞাসা করুন।",
      gu: "નમસ્તે! 👋 હું તમારો યોજના સહાયક AI છું. સરકારી યોજનાઓ માટે હું તમને કેવી રીતે મદદ કરી શકું?",
      kn: "ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ ಯೋಜನಾ ಸಹಾಯಕ AI. ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಮಾಹಿತಿಗಾಗಿ ನನ್ನನ್ನು ಕೇಳಿ.",
    };

    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: welcomeTexts[lang],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [lang]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  const speakText = (text: string) => {
    if (!speechEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#•\-[\]()]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : lang === "ta" ? "ta-IN" : lang === "te" ? "te-IN" : lang === "bn" ? "bn-IN" : lang === "gu" ? "gu-IN" : lang === "kn" ? "kn-IN" : "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getBotResponse(query, lang);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedAction: response.action,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      speakText(response.text);
    }, 600);
  };

  const ui = UI_TEXT[lang] || UI_TEXT.en;

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 px-5 py-3.5 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 animate-glow"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
          </span>
          <Bot size={22} className="transition-transform group-hover:rotate-12" />
          <span className="font-semibold text-sm tracking-wide">Ask Scheme AI</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
            {lang.toUpperCase()}
          </span>
        </button>
      )}

      {isOpen && (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-slide-up transition-all"
          style={{ height: "560px", width: "min(calc(100vw - 2.5rem), 410px)" }}
        >
          <div className="gov-stripe flex items-center justify-between p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Bot size={22} className="text-sky-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base leading-tight">{ui.title}</h3>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <Sparkles size={10} /> Online
                  </span>
                </div>
                <p className="text-[11px] text-sky-100/80 truncate max-w-[200px]">{ui.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Language)}
                  className="cursor-pointer rounded-lg bg-white/15 px-2 py-1 text-xs font-semibold text-white backdrop-blur border border-white/20 hover:bg-white/25 focus:outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                      {l.flag} {l.native}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className={`p-1.5 rounded-lg transition ${speechEnabled ? "bg-emerald-500/30 text-emerald-300" : "hover:bg-white/15 text-slate-300"}`}
                title={speechEnabled ? "Voice output ON" : "Voice output OFF"}
              >
                {speechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/15 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-medium">
              <Globe size={13} className="text-indigo-600" /> Language:
              <strong className="text-indigo-900">{LANGUAGES.find((l) => l.code === lang)?.label}</strong>
            </span>
            <button
              onClick={() => {
                setMessages([]);
                setInput("");
              }}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "bot" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-sm mt-0.5">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${m.sender === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none"
                    }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.suggestedAction && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <a
                        href={m.suggestedAction.href}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        {m.suggestedAction.label} <ArrowRight size={12} />
                      </a>
                    </div>
                  )}

                  <span
                    className={`block mt-1 text-[10px] ${m.sender === "user" ? "text-indigo-200 text-right" : "text-slate-400"
                      }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
                {m.sender === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white shadow-sm mt-0.5">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Bot size={14} />
                </div>
                <div className="flex gap-1 bg-white border px-3 py-2 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t bg-white p-2.5">
            <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5 px-1">
              Suggested Questions
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {ui.prompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="whitespace-nowrap rounded-full border border-indigo-100 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={ui.placeholder}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim()}
                className="h-9 w-9 rounded-xl bg-indigo-600 p-0 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send size={15} />
              </Button>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">{ui.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
