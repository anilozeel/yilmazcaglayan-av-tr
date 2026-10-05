// SIKÇA SORULAN SORULAR
// area: ilgili çalışma alanının slug'ı (alan sayfasında da gösterilir)
module.exports = [
  {
    group: 'Ceza Hukuku ve Ceza Avukatlığı', area: 'ceza-hukuku',
    items: [
      { q: 'Milas\'ta karakolda veya savcılıkta ifadeye çağrıldığımda avukat bulundurma hakkım var mıdır?', a: 'Evet. İfade sahibinin yasal hakkı uyarınca, soruşturmanın her aşamasında kolluk (emniyet/jandarma) veya Cumhuriyet Savcılığı nezdindeki ifadelere avukat eşlik edebilir.' },
      { q: 'Sosyal medya üzerinden yapılan hakaret veya tehditler suç teşkil eder mi?', a: 'Evet. İnternet veya sosyal medya mecralarında bir kimseye hakaret ya da tehditte bulunulması, Türk Ceza Kanunu kapsamında cezai yaptırıma tabi birer suçtur.' }
    ]
  },
  {
    group: 'Borçlar Hukuku ve Tazminat Avukatlığı', area: 'borclar-hukuku-ve-tazminat',
    items: [
      { q: 'Maddi veya manevi tazminat davalarında zamanaşımı süresi ne kadardır?', a: 'Haksız fiillerden (örneğin trafik kazası) doğan tazminat davalarında genel süre, zararın ve failin öğrenilmesinden itibaren 2 yıl ve herhalde 10 yıldır.' },
      { q: 'Sözleşmeye aykırı davranılması durumunda doğrudan dava mı açılmalıdır?', a: 'Zorunlu olmamakla birlikte, yasal süreç başlatılmadan önce karşı tarafa temerrüt (gecikme) ihtarnamesi gönderilmesi yasal usul açısından büyük önem taşır.' }
    ]
  },
  {
    group: 'İcra-İflas Hukuku ve Takip Avukatlığı', area: 'icra-iflas-hukuku',
    items: [
      { q: 'Adıma Milas İcra Dairesi\'nden ödeme emri geldi, ne kadar sürede itiraz etmeliyim?', a: 'İlamsız icra takiplerinde, borcu veya imzayı kabul etmiyorsanız ödeme emrinin size tebliğ edildiği tarihten itibaren 7 gün içinde itiraz etmeniz gerekir.' },
      { q: 'İcra takibine 7 günlük sürede itiraz etmezsem ne olur?', a: 'Takip kesinleşir ve alacaklı taraf, banka hesaplarınıza bloke konulması, maaş haczi veya taşınır/taşınmaz mallarınıza haciz konulması süreçlerini başlatabilir.' }
    ]
  },
  {
    group: 'İş Hukuku ve İşçi-İşveren Avukatlığı', area: 'is-hukuku',
    items: [
      { q: 'İşten çıkarılan her işçi kıdem tazminatına hak kazanır mı?', a: 'Hayır. İşçinin kıdem tazminatına hak kazanabilmesi için aynı işverene bağlı olarak en az 1 tam yıl çalışmış olması ve iş sözleşmesinin kanuna uygun nedenlerle feshedilmiş olması gerekir.' },
      { q: 'Milas\'ta işçi veya işveren uyuşmazlığında doğrudan dava açılabilir mi?', a: 'Hayır. İş Kanunu uyarınca, işçilik alacakları ve işe iade taleplerinde dava açılmadan önce zorunlu arabuluculuk sürecinin tamamlanması bir dava şartıdır.' }
    ]
  },
  {
    group: 'Ticaret Hukuku ve Şirketler Avukatlığı', area: 'ticaret-hukuku',
    items: [
      { q: 'Ticari işletmeler arasındaki sözleşmelerin yazılı yapılması zorunlu mudur?', a: 'Kanunen her sözleşme için yazılılık şartı aranmasa da, ticari güvenliğin tesisi ve ileride doğabilecek uyuşmazlıklarda ispat kolaylığı için yazılı yapılması esastır.' },
      { q: 'Karşılıksız çıkan bir ticari çek için adli süreç nasıl yürütülür?', a: 'Çekin bankaya ibrazında karşılıksız çıkması halinde, icra takibinin yanı sıra Cumhuriyet Başsavcılığı nezdinde karşılıksız çek düzenleme suçundan şikâyet süreci yürütülebilir.' }
    ]
  },
  {
    group: 'Gayrimenkul ve İmar Hukuku Avukatlığı', area: 'gayrimenkul-ve-imar-hukuku',
    items: [
      { q: 'Haricen (tapu müdürlüğü dışında) yapılan ev veya arsa satışı geçerli midir?', a: 'Hayır. Türk Medeni Kanunu uyarınca taşınmaz mülkiyetinin devrini amaçlayan sözleşmelerin geçerliliği, resmi olarak yalnızca Tapu Sicil Müdürlüğü önünde yapılmasına bağlıdır.' },
      { q: 'Milas Belediyesi\'nin verdiği bir imar veya para cezasına karşı nereye başvurulur?', a: 'Belediye encümeni tarafından tesis edilen idari işlemlere, imar cezalarına veya yıkım kararlarına karşı İdare Mahkemesi nezdinde iptal davası açılması gerekmektedir.' }
    ]
  },
  {
    group: 'İdare Hukuku Avukatlığı', area: 'idare-ve-vergi-hukuku',
    items: [
      { q: 'Kamu kurumlarının (valilik, belediye vb.) hukuka aykırı işlemlerine karşı dava açma süresi nedir?', a: 'İdari Yargılama Usulü Kanunu (İYUK) uyarınca, idari işlemlerin iptali talebiyle İdare Mahkemelerinde dava açma süresi yasal olarak tebliğden itibaren (genel olarak) 60 gündür.' },
      { q: 'İdari işlemin iptali davası açıldığında ilgili karar hemen durur mu?', a: 'Hayır, dava açılması idari işlemin uygulanmasını kendiliğinden durdurmaz. İşlemin durdurulması için mahkemeden açıkça "Yürütmenin Durdurulması" kararı talep edilmeli ve bu karar alınmalıdır.' }
    ]
  },
  {
    group: 'Miras Hukuku ve Ortaklığın Giderilmesi Avukatlığı', area: 'miras-hukuku',
    items: [
      { q: 'Miras kalan tarla veya evleri kardeşler arasında rızaen paylaşamazsak ne yapmalıyız?', a: 'Mirasçıların mal paylaşımında uzlaşamaması halinde, elbirliği mülkiyetinin sona erdirilmesi ve malların satışı veya taksimi için Ortaklığın Giderilmesi (İzale-i Şuyu) davası açılır.' },
      { q: 'Vefat eden akrabamın borçlarından sorumlu olmamak için ne yapmalıyım?', a: 'Miras bırakanın borçlarından sorumlu olmak istemeyen mirasçılar, ölüm tarihini öğrendikleri günden itibaren 3 ay içinde Sulh Hukuk Mahkemesi\'ne Mirasın Reddi (Reddi Miras) başvurusunda bulunmalıdır.' }
    ]
  },
  {
    group: 'Aile Hukuku ve Boşanma Avukatlığı', area: 'aile-hukuku-ve-bosanma',
    items: [
      { q: 'Anlaşmalı boşanma davası açabilmek için ne kadar süre evli kalmak gerekir?', a: 'Türk Medeni Kanunu uyarınca, anlaşmalı boşanma davası açılabilmesi için evlilik birliğinin en az 1 yıl sürmüş olması ve eşlerin ortak protokolde uzlaşması şarttır.' },
      { q: 'Boşanma davasında müşterek çocukların velayeti neye göre belirlenir?', a: 'Velayet takdirinde anne veya babanın isteklerinden ziyade, çocuğun geleceği, eğitimi, sağlığı ve maddi-manevi gelişimi için en uygun ortamı ifade eden "çocuğun üstün yararı" esas alınır.' }
    ]
  },
  {
    group: 'Otelcilik Hukuku', area: 'otelcilik-hukuku',
    items: [
      { q: 'Otellerde sürekli hukuki danışmanlık neden önemlidir?', a: 'Çünkü otellerde hukuki riskler yalnızca dava veya uyuşmazlık ortaya çıktığında değil; personel, misafir, sözleşme, KVKK, ruhsat ve günlük işletme süreçlerinde de ortaya çıkabilir. Düzenli hukuki değerlendirme, bu risklerin uyuşmazlığa dönüşmeden fark edilmesine yardımcı olur.' },
      { q: 'Bir otelin hukuki açıdan düzenli olarak kontrol etmesi gereken başlıca alanlar nelerdir?', a: 'İşçi-işveren ilişkileri, misafir güvenliği, sözleşmeler, KVKK ve kamera sistemleri, ruhsat ve idari işlemler, yangın-hijyen yükümlülükleri ile olayların doğru şekilde kayıt altına alınması başlıca alanlardır.' }
    ]
  },
  {
    group: 'Önleyici Hukuk – Hukuk Danışmanlığı', area: 'hukuki-danismanlik',
    items: [
      { q: 'Hukuki danışmanlık hizmeti sadece dava aşamasında mı alınır?', a: 'Hayır. Asıl olan, uyuşmazlıklar ve hak kayıpları henüz ortaya çıkmadan, sözleşme imzalarken veya ticari adımlar atarken önleyici olarak hukuki danışmanlık almaktır.' },
      { q: 'Şahıslar arası sözleşmeler imzalanmadan önce hukuki incelemeden geçmeli midir?', a: 'Evet. Sözleşme metinlerindeki hak mahrumiyeti yaratabilecek maddelerin veya eksik şekil şartlarının tespiti, ileride yıllar sürecek davaların açılmasını en başından engeller.' }
    ]
  }
];

module.exports.disclaimer = 'Bu sayfada yer alan soru ve cevaplar tamamen genel bilgilendirme amaçlı olup, hukuki tavsiye veya danışmanlık niteliği taşımamaktadır. Hukuki uyuşmazlıkların somut olay bazında, yasal mevzuat ve süreler dikkate alınarak bir hukuk profesyoneli eşliğinde değerlendirilmesi esastır. Sitedeki bilgilerin bireysel olarak uygulanmasından doğabilecek hak kayıplarından büromuz sorumlu tutulamaz.';
